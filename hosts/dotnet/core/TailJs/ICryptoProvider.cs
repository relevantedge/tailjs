namespace TailJs;

public interface ICryptoProvider
{
  string Hash(string text);

  string Decrypt(string text);

  string Encrypt(string text);
}
