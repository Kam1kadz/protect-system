using System.Text.Json;
using KMGuardLoader.Core;
using KMGuardLoader.Models;

namespace KMGuardLoader.ViewModels;

internal sealed class HomeViewModel : BaseViewModel
{
    private readonly ApiClient   _api;
    private readonly AppSettings _settings;
    private readonly string      _hwid;

    private UserInfo? _user;
    private string    _status  = "";
    private bool      _busy    = false;
    private bool      _running = false;

    public UserInfo? User    { get => _user;    set => Set(ref _user, value); }
    public string   Status   { get => _status;  set => Set(ref _status, value); }
    public bool     Busy     { get => _busy;    set => Set(ref _busy, value); }
    public bool     Running  { get => _running; set => Set(ref _running, value); }

    public RelayCommand LaunchCommand { get; }
    public RelayCommand LogoutCommand { get; }

    public HomeViewModel(ApiClient api, AppSettings settings, UserInfo user, string hwid)
    {
        _api      = api;
        _settings = settings;
        _user     = user;
        _hwid     = hwid;

        LaunchCommand = new RelayCommand(DoLaunch, () => !Busy && !Running);
        LogoutCommand = new RelayCommand(DoLogout, () => !Busy && !Running);
    }

    private async void DoLaunch()
    {
        Busy = true; Status = "Preparing...";

        try
        {
            AntiDebug.RunAll();
            if (AntiVM.Detected()) { Status = "Launch unavailable"; return; }

            // Step 1: Challenge
            Status = "Authenticating...";
            var chalBody = $"{{\"hwid\":\"{_hwid}\"}}";
            var chalResp = await _api.PostAsync("/api/v1/loader/challenge", chalBody)
                .ConfigureAwait(true);
            var chalDoc  = JsonDocument.Parse(chalResp);
            var challenge = chalDoc.RootElement.GetProperty("challenge").GetString()!;

            // Step 2: Sign challenge
            var signingKey = Convert.FromHexString(TenantConfig.SigningKey);
            var response   = Crypto.SignHmac(signingKey, challenge + "|" + _hwid);

            var authBody = System.Text.Json.JsonSerializer.Serialize(new
            {
                hwid           = _hwid,
                challenge      = challenge,
                response       = response,
                loader_version = "1.0.0",
                mc_version     = "1.21.4"
            });

            var authResp = await _api.PostAsync("/api/v1/loader/auth", authBody)
                .ConfigureAwait(true);
            var authDoc  = JsonDocument.Parse(authResp);
            var root     = authDoc.RootElement;

            var sessionToken   = root.GetProperty("session_token").GetString()!;
            var sessionKeyHex  = root.GetProperty("session_key").GetString()!;
            var launcherToken  = root.GetProperty("launcher_token").GetString()!;

            _api.SetSession(sessionToken, Convert.FromHexString(sessionKeyHex));

            // Step 3: Download payload
            Status = "Downloading payload...";
            var pspl = await _api.GetBytesAsync("/api/v1/loader/payload")
                .ConfigureAwait(true);

            // Step 4: Launch
            Status = "Launching...";
            await Launcher.LaunchAsync(
                sessionToken, sessionKeyHex, launcherToken, _hwid, pspl,
                _settings,
                () => App.Current.Dispatcher.Invoke(() => { Running = false; Status = ""; })
            ).ConfigureAwait(true);

            Running = true;
            Status  = "Running";
        }
        catch (UnauthorizedAccessException)
        {
            Status = "No active subscription";
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

    private void DoLogout()
    {
        SessionStore.Clear();
        App.Current.Dispatcher.Invoke(() =>
        {
            var main = (MainViewModel)((Views.MainWindow)App.Current.MainWindow).DataContext;
            main.ShowLogin();
        });
    }
}