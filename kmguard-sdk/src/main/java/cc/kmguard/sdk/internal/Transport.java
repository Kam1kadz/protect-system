package cc.kmguard.sdk.internal;

import cc.kmguard.sdk.KMGuardException;
import cc.kmguard.sdk.UserInfo;

import java.util.HashMap;
import java.util.Map;

public final class Transport {

    private final ApiClient client;

    public Transport(ApiClient client) {
        this.client = client;
    }

    public void init(String hwid, String launcherToken, String integrityProof) {
        Map<String, String> body = new HashMap<>();
        body.put("hwid",            hwid);
        body.put("launcher_token",  launcherToken);
        body.put("integrity_proof", integrityProof);

        try {
            client.post("/api/v1/runtime/init", Json.build(body));
        } catch (KMGuardException e) {
            throw e;
        } catch (Exception e) {
            throw new KMGuardException("init_failed", e);
        }
    }

    public UserInfo fetchUser() {
        try {
            String resp = client.get("/api/v1/runtime/user");
            Map<String, String> m = Json.parse(resp);
            return new UserInfo(
                    m.getOrDefault("user_id",          ""),
                    m.getOrDefault("username",         ""),
                    m.getOrDefault("role",             "user"),
                    m.getOrDefault("plan_name",        "visitor"),
                    m.getOrDefault("plan_display_name","Visitor"),
                    Long.parseLong(m.getOrDefault("license_expiry", "0"))
            );
        } catch (KMGuardException e) {
            throw e;
        } catch (Exception e) {
            throw new KMGuardException("user_fetch_failed", e);
        }
    }

    public boolean heartbeat() {
        try {
            client.post("/api/v1/runtime/heartbeat", "{}");
            return true;
        } catch (KMGuardException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    public void reportEvent(String eventType, Map<String, String> payload) {
        try {
            Map<String, String> body = new HashMap<>();
            body.put("event_type", eventType);
            String payloadJson = payload == null ? "{}" : Json.build(payload);
            String fullBody = "{\"event_type\":\"" + eventType + "\",\"payload\":" + payloadJson + "}";
            client.post("/api/v1/runtime/event", fullBody);
        } catch (Exception ignored) {}
    }

    public void terminate() {
        try {
            client.post("/api/v1/runtime/terminate", "{}");
        } catch (Exception ignored) {}
    }
}