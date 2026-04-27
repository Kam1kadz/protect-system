package cc.kmguard.sdk.internal;

import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class IntegrityChecker {
    private IntegrityChecker() {}

    /**
     * Computes canonical manifest hash from loaded class bytes.
     * Must match Go jarutil.BuildManifest() output.
     */
    public static String computeManifestHash(Map<String, byte[]> classFiles) throws Exception {
        List<String> keys = new ArrayList<>(classFiles.keySet());
        java.util.Collections.sort(keys);

        MessageDigest outer = MessageDigest.getInstance("SHA-256");
        for (String k : keys) {
            MessageDigest inner = MessageDigest.getInstance("SHA-256");
            String entryName = k.replace('.', '/') + ".class";
            byte[] hash = inner.digest(classFiles.get(k));
            outer.update(entryName.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            outer.update(Hex.encode(hash).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
        return Hex.encode(outer.digest());
    }

    /**
     * Builds integrity_proof = HMAC(session_key, "integrity:" + manifest_hash).
     */
    public static String buildProof(String sessionKeyHex, String manifestHash) throws Exception {
        return HMAC.sign(sessionKeyHex, "integrity:" + manifestHash);
    }
}