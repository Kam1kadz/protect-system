using System.Text.Json;
using System.Windows;
using KMGuardLoader.Core;
using KMGuardLoader.Models;

namespace KMGuardLoader.ViewModels;

internal sealed class LoginViewModel : BaseViewModel
{
    private readonly ApiClient         _api;
    private readonly Action<UserInfo, string, string> _onSuccess;

    private string _email    = "";
    private string _password = "";
    private string _status   = "";
    private bool   _busy     = false;

    public string Email    { get => _email;    set => Set(ref _email, value); }
    public string Password { get => _password; set => Set(ref _password, value); }
    public string Status   { get => _status;   set => Set(ref _status, value); }
    public bool   Busy     { get => _busy;     set => Set(ref _busy, value); }

    public RelayCommand LoginCommand   { get; }
    public RelayCommand AutoLoginCommand { get; }

    public LoginViewModel(ApiClient api, Action<UserInfo, string, string> onSuccess)
    {
        _api       = api;
        _onSuccess = onSuccess;

        LoginCommand    = new RelayCommand(DoLogin,    () => !Busy);
        AutoLoginCommand = new RelayCommand(DoAutoLogin, () => !Busy);
    }

    private async void DoLogin()
    {
        if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password)) return;
        Busy = true; Status = "";

        try
        {
            var body    = $"{{\"email\":\"{Email}\",\"password\":\"{Password}\"}}";
            var resp    = await _api.PostAsync("/api/v1/auth/login", body).ConfigureAwait(true);
            var doc     = JsonDocument.Parse(resp);
            var access  = doc.RootElement.GetProperty("access_token").GetString()!;

            // Get refresh token from /auth/refresh exchange
            var refreshResp = await _api.PostAsync("/api/v1/auth/refresh", "{}").ConfigureAwait(true);
            var refreshDoc  = JsonDocument.Parse(refreshResp);
            var refresh     = refreshDoc.RootElement.GetProperty("refresh_token").GetString() ?? "";

            SessionStore.SaveRefreshToken(refresh);
            _api.SetSession(access, []);

            var userJson = await _api.GetAsync("/api/v1/auth/me").ConfigureAwait(true);
            var userDoc  = JsonDocument.Parse(userJson);
            var root     = userDoc.RootElement;

            var user = new UserInfo(
                root.GetProperty("username").GetString()          ?? "",
                Email,
                root.GetProperty("role").GetString()              ?? "user",
                root.GetProperty("plan_name").GetString()         ?? "visitor",
                root.GetProperty("plan_display_name").GetString() ?? "Visitor",
                DateTimeOffset.UtcNow.AddDays(30)
            );

            _onSuccess(user, access, refresh);
        }
        catch (UnauthorizedAccessException)
        {
            Status = "Invalid email or password";
        }
        catch (Exception ex)
        {
            Status = $"Error: {ex.Message}";
        }
        finally
        {
            Busy = false;
        }
    }

    private async void DoAutoLogin()
    {
        var refresh = SessionStore.LoadRefreshToken();
        if (string.IsNullOrWhiteSpace(refresh)) return;
        Busy = true; Status = "Restoring session...";

        try
        {
            var resp   = await _api.PostAsync("/api/v1/auth/refresh", "{}").ConfigureAwait(true);
            var doc    = JsonDocument.Parse(resp);
            var access = doc.RootElement.GetProperty("access_token").GetString()!;
            var newRef = doc.RootElement.TryGetProperty("refresh_token", out var rt)
                ? rt.GetString() ?? refresh : refresh;

            SessionStore.SaveRefreshToken(newRef);
            _api.SetSession(access, []);

            var userJson = await _api.GetAsync("/api/v1/auth/me").ConfigureAwait(true);
            var userDoc  = JsonDocument.Parse(userJson);
            var root     = userDoc.RootElement;

            var user = new UserInfo(
                root.GetProperty("username").GetString() ?? "",
                "",
                root.GetProperty("role").GetString()     ?? "user",
                root.GetProperty("plan_name").GetString() ?? "visitor",
                root.GetProperty("plan_display_name").GetString() ?? "Visitor",
                DateTimeOffset.UtcNow.AddDays(30)
            );

            _onSuccess(user, access, newRef);
        }
        catch
        {
            SessionStore.Clear();
            Status = "";
        }
        finally
        {
            Busy = false;
        }
    }
}