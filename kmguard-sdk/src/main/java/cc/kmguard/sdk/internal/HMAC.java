package cc.kmguard.sdk.internal;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class HMAC {
    private HMAC() {}

    public static String sign(byte[] key, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return Hex.encode(mac.doFinal(
                data.getBytes(java.nio.charset.StandardCharsets.UTF_8)
        ));
    }

    public static String sign(String keyHex, String data) throws Exception {
        return sign(Hex.decode(keyHex), data);
    }
}