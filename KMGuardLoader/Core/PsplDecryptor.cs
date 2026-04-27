namespace KMGuardLoader.Core;

internal static class PsplDecryptor
{
    private const uint MagicV1  = 0x5053504C;
    private const byte VersionV1 = 0x01;
    private const byte VersionV2 = 0x02;

    internal static byte[] DecryptToJar(byte[] pspl, byte[] sessionKey)
    {
        using var ms  = new MemoryStream(pspl);
        using var br  = new BinaryReader(ms);

        uint magic = ReadUInt32BE(br);
        if (magic != MagicV1) throw new InvalidDataException("bad pspl magic");

        byte ver = br.ReadByte();
        if (ver != VersionV1 && ver != VersionV2)
            throw new InvalidDataException("unsupported pspl version");

        if (ver == VersionV2)
        {
            int manifestLen    = (int)ReadUInt32BE(br);
            byte[] encManifest = br.ReadBytes(manifestLen);
            // Manifest is embedded for Java SDK — we skip it in the loader
            _ = Crypto.DecryptAesGcm(sessionKey, encManifest);
        }

        uint chunkCount = ReadUInt32BE(br);
        using var jarStream = new MemoryStream();

        for (uint i = 0; i < chunkCount; i++)
        {
            int chunkLen  = (int)ReadUInt32BE(br);
            byte[] enc    = br.ReadBytes(chunkLen);
            byte[] plain  = Crypto.DecryptAesGcm(sessionKey, enc);
            jarStream.Write(plain);
            Array.Clear(plain);
        }

        return jarStream.ToArray();
    }

    private static uint ReadUInt32BE(BinaryReader br)
    {
        byte[] b = br.ReadBytes(4);
        if (BitConverter.IsLittleEndian) Array.Reverse(b);
        return BitConverter.ToUInt32(b, 0);
    }
}