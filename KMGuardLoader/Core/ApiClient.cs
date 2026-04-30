using System.Net;
using System.Net.Http;
using System.Net.Security;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace KMGuardLoader.Core;

internal sealed class ApiClient : IDisposable
{
    private readonly HttpClient _http;
    private          byte[]?    _sessionKey;
    private          string?    _sessionToken;

    private const string UA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36";

    internal ApiClient()
    {
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = ValidateCert
        };

        _http = new HttpClient(handler)
        {
            BaseAddress = new Uri(TenantConfig.ApiBaseUrl),
            Timeout     = TimeSpan.FromSeconds(15)
        };
        _http.DefaultRequestHeaders.Add("User-Agent", UA);
        _http.DefaultRequestHeaders.Add("X-Tenant-ID", TenantConfig.TenantId);
    }

    internal void SetSession(string token, byte[] key)
    {
        _sessionToken = token;
        _sessionKey   = key;
    }

    internal async Task<string> PostAsync(string path, string body)
    {
        using var req = BuildRequest(HttpMethod.Post, path, body);
        using var resp = await _http.SendAsync(req).ConfigureAwait(false);
        await AssertSuccess(resp);
        return await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
    }

    internal async Task<string> GetAsync(string path)
    {
        using var req = BuildRequest(HttpMethod.Get, path, null);
        using var resp = await _http.SendAsync(req).ConfigureAwait(false);
        await AssertSuccess(resp);
        return await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
    }

    internal async Task<byte[]> GetBytesAsync(string path)
    {
        using var req = BuildRequest(HttpMethod.Get, path, null);
        using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead)
            .ConfigureAwait(false);
        await AssertSuccess(resp);
        return await resp.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
    }

    private HttpRequestMessage BuildRequest(HttpMethod method, string path, string? body)
    {
        var ts    = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var nonce = Crypto.RandomHex(16);
        var bodyStr = body ?? "";

        var req = new HttpRequestMessage(method, path);

        if (_sessionKey != null && _sessionToken != null)
        {
            var payload  = $"{method.Method}\n{path}\n{ts}\n{nonce}\n{bodyStr}";
            var sig      = Crypto.SignHmac(_sessionKey, payload);
            req.Headers.Add("X-Session-Token", _sessionToken);
            req.Headers.Add("X-Signature",     sig);
        }

        req.Headers.Add("X-Timestamp", ts);
        req.Headers.Add("X-Nonce",     nonce);

        if (body != null)
            req.Content = new StringContent(body, Encoding.UTF8, "application/json");

        return req;
    }

    private static async Task AssertSuccess(HttpResponseMessage resp)
    {
        if (resp.StatusCode == HttpStatusCode.Unauthorized ||
            resp.StatusCode == HttpStatusCode.Forbidden)
        {
            var body = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
            throw new UnauthorizedAccessException(body);
        }
        resp.EnsureSuccessStatusCode();
    }

    private static bool ValidateCert(
        HttpRequestMessage _,
        X509Certificate2? cert,
        X509Chain? __,
        SslPolicyErrors errors)
    {
#if DEBUG
        return true;
#else
        if (cert == null) return false;
        var pin = Convert.ToHexString(
            SHA256.HashData(cert.GetPublicKey())
        ).ToLowerInvariant();
        return pin == TenantConfig.CertPin;
#endif
    }

    public void Dispose() => _http.Dispose();
}