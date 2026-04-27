package cc.kmguard.sdk.internal;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.HashMap;
import java.util.Map;

/**
 * Decrypts PSPL v2 payload and defines all .class entries
 * in an isolated ClassLoader. Never writes to disk.
 */
public final class IsolatedLoader extends ClassLoader {

    private static final int MAGIC_V1   = 0x5053504C;
    private static final byte VER_V1    = 0x01;
    private static final byte VER_V2    = 0x02;

    private final Map<String, byte[]> classes = new HashMap<>();
    private String manifestHash = null;

    private IsolatedLoader(ClassLoader parent) {
        super(parent);
    }

    public static IsolatedLoader load(byte[] pspl, byte[] sessionKey) throws Exception {
        IsolatedLoader loader = new IsolatedLoader(
                Thread.currentThread().getContextClassLoader()
        );
        loader.parsePSPL(pspl, sessionKey);
        return loader;
    }

    private void parsePSPL(byte[] pspl, byte[] sessionKey) throws Exception {
        ByteBuffer buf = ByteBuffer.wrap(pspl).order(ByteOrder.BIG_ENDIAN);

        int magic = buf.getInt();
        if (magic != MAGIC_V1) throw new IllegalStateException("bad pspl magic");

        byte ver = buf.get();
        if (ver != VER_V1 && ver != VER_V2) throw new IllegalStateException("unsupported pspl version");

        if (ver == VER_V2) {
            int manifestLen   = buf.getInt();
            byte[] encManifest = new byte[manifestLen];
            buf.get(encManifest);
            byte[] manifestJson = AES.decrypt(sessionKey, encManifest);
            String mj = new String(manifestJson, java.nio.charset.StandardCharsets.UTF_8);
            this.manifestHash = Json.get(mj, "manifest_hash");
            for (byte b : manifestJson) { }
        }

        int chunkCount = buf.getInt();
        java.io.ByteArrayOutputStream jarBuf = new java.io.ByteArrayOutputStream();

        for (int i = 0; i < chunkCount; i++) {
            int chunkLen = buf.getInt();
            byte[] enc   = new byte[chunkLen];
            buf.get(enc);
            byte[] plain = AES.decrypt(sessionKey, enc);
            jarBuf.write(plain);
            for (int j = 0; j < plain.length; j++) plain[j] = 0;
        }

        parseJar(jarBuf.toByteArray());
        jarBuf.reset();
    }

    private void parseJar(byte[] jarBytes) throws Exception {
        try (java.util.zip.ZipInputStream zis =
                     new java.util.zip.ZipInputStream(new ByteArrayInputStream(jarBytes))) {
            java.util.zip.ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().endsWith(".class")) {
                    byte[] classBytes = zis.readAllBytes();
                    String className  = entry.getName()
                            .replace('/', '.')
                            .replaceAll("\\.class$", "");
                    classes.put(className, classBytes);
                }
                zis.closeEntry();
            }
        }
        for (int i = 0; i < jarBytes.length; i++) jarBytes[i] = 0;
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        byte[] b = classes.get(name);
        if (b == null) throw new ClassNotFoundException(name);
        Class<?> cls = defineClass(name, b, 0, b.length);
        for (int i = 0; i < b.length; i++) b[i] = 0;
        classes.remove(name);
        return cls;
    }

    public String getManifestHash() {
        return manifestHash;
    }

    public void defineAll() throws ClassNotFoundException {
        for (String name : new java.util.ArrayList<>(classes.keySet())) {
            loadClass(name);
        }
    }
}