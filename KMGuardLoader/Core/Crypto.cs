using System.Security.Cryptography;
using System.Text;

namespace KMGuardLoader.Core;

internal static class Crypto
{
    internal static byte[] DeriveKey(byte[] master, string context)
    {
        using var sha = SHA256.Create();
        sha.TransformBlock(master, 0, master.Length, null, 0);
        var ctx = Encoding.UTF8.GetBytes(context);
        sha.TransformFinalBlock(ctx, 0, ctx.Length);
        return sha.Hash!;
    }

    internal static byte[] DecryptAesGcm(byte[] key, byte[] ciphertext)
    {
        const int nonceSize = 12;
        const int tagSize   = 16;

        if (ciphertext.Length < nonceSize + tagSize)
            throw new CryptographicException("ciphertext too short");

        var nonce      = ciphertext[..nonceSize];
        var tag        = ciphertext[^tagSize..];
        var encrypted  = ciphertext[nonceSize..^tagSize];
        var plaintext  = new byte[encrypted.Length];

        using var aes = new AesGcm(key, tagSize);
        aes.Decrypt(nonce, encrypted, tag, plaintext);
        return plaintext;
    }

    internal static string SignHmac(byte[] key, string data)
    {
        using var hmac = new HMACSHA256(key);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    internal static string RandomHex(int bytes)
    {
        var b = RandomNumberGenerator.GetBytes(bytes);
        return Convert.ToHexString(b).ToLowerInvariant();
    }

    internal static string Sha256Hex(byte[] data)
    {
        return Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();
    }
}