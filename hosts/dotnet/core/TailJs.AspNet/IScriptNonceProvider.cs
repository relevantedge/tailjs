namespace TailJs.AspNet;

public interface IScriptNonceProvider
{
  string? GetNonce();
}
