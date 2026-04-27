using System.IO;
using System.Text.Json;

namespace KMGuardLoader.Models;

internal sealed class AppSettings
{
    public int    RamMb        { get; set; } = 2048;
    public bool   Fullscreen   { get; set; } = false;
    public int    WindowWidth  { get; set; } = 1280;
    public int    WindowHeight { get; set; } = 720;
    public string Language     { get; set; } = "en";
    public string JavaPath     { get; set; } = "";

    private static string FilePath =>
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            TenantConfig.LoaderName.Replace(" ", "_"),
            "settings.json");

    internal static AppSettings Load()
    {
        try
        {
            if (File.Exists(FilePath))
            {
                var json = File.ReadAllText(FilePath);
                return JsonSerializer.Deserialize<AppSettings>(json) ?? new AppSettings();
            }
        }
        catch { }
        return new AppSettings();
    }

    internal void Save()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
            File.WriteAllText(FilePath, JsonSerializer.Serialize(this,
                new JsonSerializerOptions { WriteIndented = true }));
        }
        catch { }
    }
}