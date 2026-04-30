package cc.kmguard.sdk;

import cc.kmguard.sdk.internal.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * KMGuard SDK — public API.
 *
 * Usage:
 *   KMGuard.init("YOUR_API_URL", "YOUR_TENANT_ID", "KMGUARD_MAP_NAME");
 *   UserInfo user = KMGuard.getUser();
 *   String plan   = user.getPlan();
 */
public final class KMGuard {

    private static final AtomicBoolean           initialized = new AtomicBoolean(false);
    private static final AtomicReference<UserInfo>  userRef  = new AtomicReference<>();
    private static volatile Transport            transport;
    private static volatile HeartbeatTask        heartbeat;
    private static volatile IsolatedLoader       loader;
    private static volatile String               sessionToken;

    private KMGuard() {}

    /**
     * Initializes KMGuard. Must be called once before any other method.
     *
     * @param apiBaseUrl   base URL of the protect server (e.g. "https://api.example.com")
     * @param tenantId     tenant UUID
     * @param shmapName    name of the shared memory map written by the loader
     */
    public static void init(String apiBaseUrl, String tenantId, String shmapName) {
        if (!initialized.compareAndSet(false, true)) {
            throw new KMGuardException("already_initialized");
        }

        try {
            JVMGuard.check();

            SharedMemory.Handshake hs = SharedMemory.read(shmapName);
            sessionToken = hs.sessionToken;

            byte[] sessionKey = Hex.decode(hs.sessionKeyHex);

            loader = IsolatedLoader.load(hs.payloadBytes, sessionKey);

            String computedHash = IntegrityChecker.computeManifestHash(collectClasses());
            if (loader.getManifestHash() != null && !loader.getManifestHash().equals(computedHash)) {
                throw new KMGuardException("integrity_check_failed");
            }

            String integrityProof = IntegrityChecker.buildProof(hs.sessionKeyHex, computedHash);

            ApiClient client = new ApiClient(apiBaseUrl, tenantId);
            client.setSession(hs.sessionToken, sessionKey);
            transport = new Transport(client);

            transport.init(hs.hwid, hs.launcherToken, integrityProof);

            UserInfo user = transport.fetchUser();
            userRef.set(user);

            heartbeat = new HeartbeatTask(transport, 45, KMGuard::onHeartbeatFail);
            heartbeat.start();

        } catch (KMGuardException e) {
            initialized.set(false);
            throw e;
        } catch (Exception e) {
            initialized.set(false);
            throw new KMGuardException("init_failed", e);
        }
    }

    /**
     * Returns UserInfo for the currently authenticated user.
     */
    public static UserInfo getUser() {
        ensureInit();
        return userRef.get();
    }

    /**
     * Returns the raw session token for custom requests.
     */
    public static String getSessionToken() {
        ensureInit();
        return sessionToken;
    }

    /**
     * Manually triggers a heartbeat. Returns false if session is no longer valid.
     */
    public static boolean heartbeat() {
        ensureInit();
        return transport.heartbeat();
    }

    /**
     * Reports a security event to the server.
     */
    public static void reportEvent(String eventType, Map<String, String> payload) {
        if (transport != null) {
            transport.reportEvent(eventType, payload);
        }
    }

    /**
     * Gracefully shuts down KMGuard. Call on cheat unload.
     */
    public static void shutdown() {
        if (heartbeat != null) heartbeat.stop();
        initialized.set(false);
        userRef.set(null);
        sessionToken = null;
        loader       = null;
    }

    private static void ensureInit() {
        if (!initialized.get()) {
            throw new KMGuardException("not_initialized");
        }
    }

    private static void onHeartbeatFail() {
        shutdown();
        Runtime.getRuntime().halt(0);
    }

    /**
     * Collects loaded class bytes from the isolated loader
     * for integrity verification.
     */
    private static Map<String, byte[]> collectClasses() {
        if (loader == null) return new HashMap<>();
        try {
            java.lang.reflect.Field f = IsolatedLoader.class.getDeclaredField("classes");
            f.setAccessible(true);
            @SuppressWarnings("unchecked")
            Map<String, byte[]> raw = (Map<String, byte[]>) f.get(loader);
            return new java.util.HashMap<>(raw);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}