using KMGuardLoader.Models;

namespace KMGuardLoader.ViewModels;

internal sealed class SettingsViewModel : BaseViewModel
{
    private readonly AppSettings _settings;
    private readonly Action      _onClose;

    private int    _ramMb;
    private bool   _fullscreen;
    private int    _width;
    private int    _height;
    private string _language;
    private string _javaPath;

    public int    RamMb      { get => _ramMb;      set => Set(ref _ramMb, value); }
    public bool   Fullscreen { get => _fullscreen;  set => Set(ref _fullscreen, value); }
    public int    Width      { get => _width;       set => Set(ref _width, value); }
    public int    Height     { get => _height;      set => Set(ref _height, value); }
    public string Language   { get => _language;    set => Set(ref _language, value); }
    public string JavaPath   { get => _javaPath;    set => Set(ref _javaPath, value); }

    public RelayCommand SaveCommand   { get; }
    public RelayCommand CancelCommand { get; }

    public SettingsViewModel(AppSettings settings, Action onClose)
    {
        _settings   = settings;
        _onClose    = onClose;
        _ramMb      = settings.RamMb;
        _fullscreen = settings.Fullscreen;
        _width      = settings.WindowWidth;
        _height     = settings.WindowHeight;
        _language   = settings.Language;
        _javaPath   = settings.JavaPath;

        SaveCommand   = new RelayCommand(Save);
        CancelCommand = new RelayCommand(_onClose);
    }

    private void Save()
    {
        _settings.RamMb        = RamMb;
        _settings.Fullscreen   = Fullscreen;
        _settings.WindowWidth  = Width;
        _settings.WindowHeight = Height;
        _settings.Language     = Language;
        _settings.JavaPath     = JavaPath;
        _settings.Save();
        _onClose();
    }
}