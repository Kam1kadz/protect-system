using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace KMGuardLoader.Core;

internal static class SessionStore
{
    private static string StorePath =>
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            TenantConfig.LoaderName.Replace(" ", "_"),
            "session.dat");

    internal static void SaveRefreshToken(string token)
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(StorePath)!);
            byte[] data      = Encoding.UTF8.GetBytes(token);
            byte[] encrypted = ProtectedData.Protect(data, null, DataProtectionScope.CurrentUser);
            File.WriteAllBytes(StorePath, encrypted);
        }
        catch { }
    }

    internal static string? LoadRefreshToken()
    {
        try
        {
            if (!File.Exists(StorePath)) return null;
            byte[] encrypted  = File.ReadAllBytes(StorePath);
            byte[] decrypted  = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(decrypted);
        }
        catch { return null; }
    }

    internal static void Clear()
    {
        try { if (File.Exists(StorePath)) File.Delete(StorePath); }
        catch { }
    }
}