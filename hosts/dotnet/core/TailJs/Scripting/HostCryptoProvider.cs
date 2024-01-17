// ReSharper disable UnusedMember.Global

using System.Security.Cryptography;
using System.Text;

using Microsoft.ClearScript;

namespace TailJs.Scripting;

internal class CryptoProvider : ICryptoProvider
{
  private readonly ConfiguredKey? _currentKey;
  private Dictionary<string, ConfiguredKey> _allKeys = new();

  public CryptoProvider(IReadOnlyList<string> keys)
  {
    for (var i = 0; i < keys.Count; i++)
    {
      if (keys[i] == "")
        continue;

      var key = new byte[8];
      var iv = new byte[8];
      using var sha1 = SHA1.Create();
      var bytes = sha1.ComputeHash(Encoding.UTF8.GetBytes(keys[0]));
      Array.Copy(bytes, 0, key, 0, 8);
      Array.Copy(bytes, 8, iv, 0, 8);

      var keyInfo = new ConfiguredKey(
        key,
        iv,
        EncodeBase64(
          Convert
            .ToBase64String(key.Select((p, i) => (byte)(p ^ iv[i])).ToArray())
            .Substring(0, 8)
            .PadRight(8, '0')
        )
      );

      _allKeys[keyInfo.Prefix] = keyInfo;
      if (i == 0)
      {
        _currentKey = keyInfo;
      }
    }
  }

  private static string EncodeBase64(string s)
  {
    var encoded = new char[s.Length].AsSpan();
    var i = 0;
    foreach (var p in s.AsSpan())
    {
      encoded[i++] = p switch
      {
        '+' => '.',
        '/' => '~',
        '=' => '_',
        _ => p
      };
    }

    return encoded.ToString();
  }

  private static string DecodeBase64(string s)
  {
    var decoded = new char[s.Length].AsSpan();
    var i = 0;
    foreach (var p in s.AsSpan())
    {
      decoded[i++] = p switch
      {
        '.' => '+',
        '~' => '/',
        '_' => '=',
        _ => p
      };
    }

    return decoded.ToString();
  }

  #region ICryptoProvider Members

  [ScriptMember("decrypt")]
  public string Decrypt(string text)
  {
    if (
      _currentKey == null
      || text is not { Length: >= 8 }
      || !text.All(p => char.IsLetterOrDigit(p) || p is '.' or '_' or '~')
    )
      return text;

    var prefix = text.Substring(0, 8);
    if (!_allKeys.TryGetValue(prefix, out var match))
    {
      return text;
    }

    text = text.Substring(8);

    var bytes = Convert.FromBase64String(DecodeBase64(text));

    using var des = DES.Create();
    des.Mode = CipherMode.CBC;
    des.Padding = PaddingMode.PKCS7;

    using var decrypt = des.CreateDecryptor(match.Key, match.Iv);

    var output = decrypt.TransformFinalBlock(bytes, 0, bytes.Length);
    return string.Concat("1", Encoding.UTF8.GetString(output));
  }

  [ScriptMember("encrypt")]
  public string Encrypt(string text)
  {
    if (_currentKey == null)
      return text;

    using var des = DES.Create();
    des.Mode = CipherMode.CBC;
    des.Padding = PaddingMode.PKCS7;

    using var encrypt = des.CreateEncryptor(_currentKey.Key, _currentKey.Iv);
    var bytes = Encoding.UTF8.GetBytes(text);

    var output = encrypt.TransformFinalBlock(bytes, 0, bytes.Length);
    return string.Concat(_currentKey.Prefix, EncodeBase64(Convert.ToBase64String(output)));
  }

  [ScriptMember("hash")]
  public string Hash(string text)
  {
    using var sha1 = SHA1.Create();
    return EncodeBase64(Convert.ToBase64String(sha1.ComputeHash(Encoding.UTF8.GetBytes(text))));
  }

  #endregion


  #region Nested type: ConfiguredKey

  private record ConfiguredKey(byte[] Key, byte[] Iv, string Prefix);

  #endregion
}
