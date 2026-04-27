package cc.kmguard.sdk.internal;

import java.io.RandomAccessFile;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;

/**
 * Reads the KMGuard handshake struct written by the C# loader.
 *
 * Struct layout (little-endian):
 *   [4]  magic        = 0x4B4D4756  ("KMGV")
 *   [4]  version      = 0x01000000
 *   [2]  session_token_len
 *   [n]  session_token (UTF-8)
 *   [2]  session_key_len
 *   [n]  session_key  (hex string)
 *   [2]  launcher_token_len
 *   [n]  launcher_token (hex string)
 *   [2]  hwid_len
 *   [n]  hwid (UTF-8)
 *   [4]  payload_size
 *   [n]  payload (encrypted PSPL bytes)
 */
public final class SharedMemory {

    private static final int MAGIC   = 0x4B4D4756;
    private static final int VERSION = 0x01000000;

    public static final class Handshake {
        public final String sessionToken;
        public final String sessionKeyHex;
        public final String launcherToken;
        public final String hwid;
        public final byte[] payloadBytes;

        Handshake(String sessionToken, String sessionKeyHex,
                  String launcherToken, String hwid, byte[] payloadBytes) {
            this.sessionToken   = sessionToken;
            this.sessionKeyHex  = sessionKeyHex;
            this.launcherToken  = launcherToken;
            this.hwid           = hwid;
            this.payloadBytes   = payloadBytes;
        }
    }

    public static Handshake read(String mapName) throws Exception {
        String os = System.getProperty("os.name", "").toLowerCase();
        if (!os.contains("win")) {
            throw new UnsupportedOperationException("SharedMemory only supported on Windows");
        }

        try (RandomAccessFile raf = new RandomAccessFile("//./Global/" + mapName, "r");
             FileChannel ch = raf.getChannel()) {

            MappedByteBuffer buf = ch.map(FileChannel.MapMode.READ_ONLY, 0, ch.size());
            buf.order(ByteOrder.LITTLE_ENDIAN);

            int magic = buf.getInt();
            if (magic != MAGIC) throw new IllegalStateException("bad magic");

            int ver = buf.getInt();
            if (ver != VERSION) throw new IllegalStateException("unsupported version");

            String sessionToken   = readString(buf);
            String sessionKeyHex  = readString(buf);
            String launcherToken  = readString(buf);
            String hwid           = readString(buf);

            int payloadSize = buf.getInt();
            byte[] payload  = new byte[payloadSize];
            buf.get(payload);

            tryUnmap(buf);

            return new Handshake(sessionToken, sessionKeyHex, launcherToken, hwid, payload);
        }
    }

    private static String readString(ByteBuffer buf) {
        int len = buf.getShort() & 0xFFFF;
        byte[] b = new byte[len];
        buf.get(b);
        return new String(b, StandardCharsets.UTF_8);
    }

    private static void tryUnmap(MappedByteBuffer buf) {
        try {
            Class<?> cls  = Class.forName("sun.nio.ch.DirectBuffer");
            Method clean  = cls.getMethod("cleaner");
            Object cleaner = clean.invoke(buf);
            if (cleaner != null) {
                cleaner.getClass().getMethod("clean").invoke(cleaner);
            }
        } catch (Exception ignored) {}
    }
}