using System.Diagnostics;
using System.IO;
using System.Reflection;

namespace KMGuardLoader.Core;

internal static class Launcher
{
    private static SharedMemoryWriter? _smw;
    private static string?             _tmpJar;
    private static Process?            _javaProcess;
    private static CancellationTokenSource? _watchdogCts;

    internal static async Task LaunchAsync(
        string sessionToken,
        string sessionKeyHex,
        string launcherToken,
        string hwid,
        byte[] psplEncrypted,
        AppSettings settings,
        Action onProcessExit)
    {
        byte[] sessionKey = Convert.FromHexString(sessionKeyHex);

        byte[] jarBytes = PsplDecryptor.DecryptToJar(psplEncrypted, sessionKey);

        _tmpJar = Path.Combine(Path.GetTempPath(), Crypto.RandomHex(16) + ".tmp");
        await File.WriteAllBytesAsync(_tmpJar, jarBytes).ConfigureAwait(false);
        Array.Clear(jarBytes);

        _smw = new SharedMemoryWriter();
        _smw.Write(TenantConfig.MapName, sessionToken, sessionKeyHex,
                   launcherToken, hwid, psplEncrypted);

        string javaExe = FindJavaExe(settings);
        var args = BuildArgs(settings);

        var psi = new ProcessStartInfo
        {
            FileName        = javaExe,
            Arguments       = args,
            UseShellExecute = false,
            CreateNoWindow  = false
        };

        _javaProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };
        _javaProcess.Exited += (_, _) =>
        {
            Cleanup();
            onProcessExit();
        };
        _javaProcess.Start();

        // Delete bootstrap JAR after 3 seconds — JVM already loaded it
        _ = Task.Run(async () =>
        {
            await Task.Delay(3000).ConfigureAwait(false);
            TryDeleteTmp();
        });

        _watchdogCts = new CancellationTokenSource();
        AntiDebug.StartWatchdog(_watchdogCts.Token);
    }

    private static string BuildArgs(AppSettings s)
    {
        var parts = new List<string>
        {
            $"-Xmx{s.RamMb}m",
            $"-Xms512m",
            $"-Dkmguard.map={TenantConfig.MapName}",
            $"-Dkmguard.api={TenantConfig.ApiBaseUrl}",
            $"-Dkmguard.tid={TenantConfig.TenantId}",
            "-jar", $"\"{_tmpJar}\""
        };

        if (s.Fullscreen) parts.Add("--fullscreen");
        if (s.WindowWidth > 0 && s.WindowHeight > 0)
        {
            parts.Add($"--width {s.WindowWidth}");
            parts.Add($"--height {s.WindowHeight}");
        }

        return string.Join(" ", parts);
    }

    private static string FindJavaExe(AppSettings s)
    {
        if (!string.IsNullOrWhiteSpace(s.JavaPath) && File.Exists(s.JavaPath))
            return s.JavaPath;

        // Try JAVA_HOME
        var javaHome = Environment.GetEnvironmentVariable("JAVA_HOME");
        if (!string.IsNullOrWhiteSpace(javaHome))
        {
            var path = Path.Combine(javaHome, "bin", "java.exe");
            if (File.Exists(path)) return path;
        }

        // Try PATH
        foreach (var dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(';'))
        {
            var path = Path.Combine(dir.Trim(), "java.exe");
            if (File.Exists(path)) return path;
        }

        return "java";
    }

    private static void TryDeleteTmp()
    {
        try
        {
            if (_tmpJar != null && File.Exists(_tmpJar))
                File.Delete(_tmpJar);
        }
        catch { }
        _tmpJar = null;
    }

    private static void Cleanup()
    {
        _watchdogCts?.Cancel();
        TryDeleteTmp();
        _smw?.Dispose();
        _smw = null;
    }
}