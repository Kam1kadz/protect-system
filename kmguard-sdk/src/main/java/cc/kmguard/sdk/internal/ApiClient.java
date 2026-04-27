package cc.kmguard.sdk.internal;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Map;

public final class ApiClient {

    private final String baseUrl;
    private final String tenantId;
    private volatile String sessionToken;
    private volatile byte[] sessionKey;

    private static final String UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                    "AppleWebKit/537.36 (KHTML, like Gecko) " +
                    "Chrome/124.0.0.0 Safari/537.36";

    public ApiClient(String baseUrl, String tenantId) {
        this.baseUrl  = baseUrl;
        this.tenantId = tenantId;
    }

    public void setSession(String token, byte[] key) {
        this.sessionToken = token;
        this.sessionKey   = key;
    }

    public String post(String path, String body) throws Exception {
        return request("POST", path, body);
    }

    public String get(String path) throws Exception {
        return request("GET", path, null);
    }

    private String request(String method, String path, String body) throws Exception {
        String ts    = String.valueOf(System.currentTimeMillis() / 1000L);
        String nonce = generateNonce();

        String bodyStr = body == null ? "" : body;
        String sigPayload = method + "\n" + path + "\n" + ts + "\n" + nonce + "\n" + bodyStr;
        String sig = HMAC.sign(sessionKey, sigPayload);

        URL url = new URL(baseUrl + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(10000);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("User-Agent", UA);
        conn.setRequestProperty("X-Tenant-ID",      tenantId);
        conn.setRequestProperty("X-Session-Token",   sessionToken);
        conn.setRequestProperty("X-Signature",       sig);
        conn.setRequestProperty("X-Timestamp",       ts);
        conn.setRequestProperty("X-Nonce",           nonce);

        if (body != null) {
            conn.setDoOutput(true);
            byte[] bBytes = bodyStr.getBytes(StandardCharsets.UTF_8);
            conn.setRequestProperty("Content-Length", String.valueOf(bBytes.length));
            try (OutputStream os = conn.getOutputStream()) {
                os.write(bBytes);
            }
        }

        int code = conn.getResponseCode();
        if (code == 401 || code == 403) {
            throw new cc.kmguard.sdk.KMGuardException("session_invalid");
        }

        java.io.InputStream is = code >= 400
                ? conn.getErrorStream()
                : conn.getInputStream();

        if (is == null) return "";
        return new String(is.readAllBytes(), StandardCharsets.UTF_8);
    }

    private static String generateNonce() {
        byte[] b = new byte[16];
        new SecureRandom().nextBytes(b);
        return Hex.encode(b);
    }
}