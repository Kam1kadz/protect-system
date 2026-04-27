using KMGuardLoader.Core;
using KMGuardLoader.Models;

namespace KMGuardLoader.ViewModels;

internal sealed class MainViewModel : BaseViewModel
{
    private readonly ApiClient   _api;
    private readonly AppSettings _settings;
    private readonly string      _hwid;

    private object? _currentView;
    public  object? CurrentView { get => _currentView; set => Set(ref _currentView, value); }

    public MainViewModel()
    {
        _api      = new ApiClient();
        _settings = AppSettings.Load();
        _hwid     = HwidCollector.Collect();

        ShowLogin();
    }

    internal void ShowLogin()
    {
        var vm = new LoginViewModel(_api, (user, access, _) =>
        {
            ShowHome(user);
        });
        CurrentView = vm;
        vm.AutoLoginCommand.Execute(null);
    }

    internal void ShowHome(UserInfo user)
    {
        CurrentView = new HomeViewModel(_api, _settings, user, _hwid);
    }

    internal void ShowSettings()
    {
        CurrentView = new SettingsViewModel(_settings, () =>
        {
            // Go back to home if user was logged in, else login
            if (CurrentView is not HomeViewModel && CurrentView is not LoginViewModel)
                ShowLogin();
        });
    }
}