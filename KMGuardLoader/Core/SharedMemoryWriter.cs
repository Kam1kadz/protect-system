using System.IO.MemoryMappedFiles;
using System.Text;

namespace KMGuardLoader.Core;

/// <summary>
/// Writes the KMGuard handshake struct to a named memory-mapped file.
/// Layout matches SharedMemory.java exactly.
/// </summary>
internal sealed class SharedMemoryWriter : IDisposable
{
    private MemoryMappedFile? _mmf;

    internal void Write(
        string mapName,
        string sessionToken,
        string sessionKeyHex,
        string launcherToken,
        string hwid,
        byte[] psplBytes)
    {
        const uint Magic   = 0x4B4D4756;
        const uint Version = 0x01000000;

        using var ms  = new MemoryStream();
        using var bw  = new BinaryWriter(ms, Encoding.UTF8, leaveOpen: true);

        WriteUInt32LE(bw, Magic);
        WriteUInt32LE(bw, Version);
        WriteString(bw, sessionToken);
        WriteString(bw, sessionKeyHex);
        WriteString(bw, launcherToken);
        WriteString(bw, hwid);
        WriteUInt32LE(bw, (uint)psplBytes.Length);
        bw.Write(psplBytes);
        bw.Flush();

        byte[] data = ms.ToArray();

        _mmf = MemoryMappedFile.CreateNew(
            mapName,
            data.Length,
            MemoryMappedFileAccess.ReadWrite);

        using var accessor = _mmf.CreateViewAccessor();
        accessor.WriteArray(0, data, 0, data.Length);
        Array.Clear(data);
    }

    private static void WriteString(BinaryWriter bw, string s)
    {
        byte[] b = Encoding.UTF8.GetBytes(s);
        bw.Write((ushort)b.Length);
        bw.Write(b);
    }

    private static void WriteUInt32LE(BinaryWriter bw, uint v)
    {
        bw.Write(BitConverter.IsLittleEndian
            ? v
            : BinaryPrimitives(v));
    }

    private static uint BinaryPrimitives(uint v) =>
        ((v & 0xFF) << 24) | ((v & 0xFF00) << 8) |
        ((v >> 8) & 0xFF00) | ((v >> 24) & 0xFF);

    public void Dispose()
    {
        _mmf?.Dispose();
        _mmf = null;
    }
}