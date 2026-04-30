namespace KMGuardLoader;

internal static class TenantConfig
{
#if DEBUG
    internal const string ApiBaseUrl    = "http://localhost:8080";
    internal const string TenantId      = "00000000-0000-0000-0000-000000000000";
    internal const string SigningKey     = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    internal const string LoaderName    = "KMGuardLoader Dev";
    internal const string CertPin       = "";
    internal const string MapName       = "KMGuardDev";
    internal const string AccentHex     = "#7c3aed";
#else
    // --- REPLACE BEFORE RELEASE ---
    internal const string ApiBaseUrl    = "$(API_BASE_URL)";
    internal const string TenantId      = "$(TENANT_ID)";
    internal const string SigningKey     = "$(SIGNING_KEY)";
    internal const string LoaderName    = "$(LOADER_NAME)";
    internal const string CertPin       = "$(CERT_PIN_SHA256)";
    internal const string MapName       = "$(MAP_NAME)";
    internal const string AccentHex     = "$(ACCENT_HEX)";
#endif
}