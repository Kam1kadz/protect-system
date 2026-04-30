package cc.kmguard.sdk.internal;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Arrays;

public final class AES {
    private static final int GCM_NONCE_LEN = 12;
    private static final int GCM_TAG_BITS  = 128;

    private AES() {}

    public static byte[] decrypt(byte[] key, byte[] ciphertext) throws Exception {
        if (ciphertext.length < GCM_NONCE_LEN) {
            throw new IllegalArgumentException("ciphertext too short");
        }
        byte[] nonce      = Arrays.copyOfRange(ciphertext, 0, GCM_NONCE_LEN);
        byte[] encrypted  = Arrays.copyOfRange(ciphertext, GCM_NONCE_LEN, ciphertext.length);

        SecretKey sk = new SecretKeySpec(key, "AES");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, sk, new GCMParameterSpec(GCM_TAG_BITS, nonce));
        return cipher.doFinal(encrypted);
    }

    public static byte[] encrypt(byte[] key, byte[] plaintext) throws Exception {
        byte[] nonce = new byte[GCM_NONCE_LEN];
        new SecureRandom().nextBytes(nonce);

        SecretKey sk = new SecretKeySpec(key, "AES");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, sk, new GCMParameterSpec(GCM_TAG_BITS, nonce));
        byte[] enc = cipher.doFinal(plaintext);

        byte[] out = new byte[GCM_NONCE_LEN + enc.length];
        System.arraycopy(nonce, 0, out, 0, GCM_NONCE_LEN);
        System.arraycopy(enc,   0, out, GCM_NONCE_LEN, enc.length);
        return out;
    }

    public static byte[] deriveKey(byte[] master, String context) throws Exception {
        java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
        md.update(master);
        md.update(context.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return md.digest();
    }
}