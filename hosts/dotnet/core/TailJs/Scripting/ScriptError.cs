namespace TailJs.Scripting;

public class ScriptError : Exception
{
  public string? Type { get; }

  public string? ScriptStackTrace { get; }

  public ScriptError(string? message = "(unspecified error)", string? type = null, string? stack = null)
    : base(message)
  {
    Type = type;
    ScriptStackTrace = stack;
  }

  public override string ToString() =>
    string.Concat(
      string.IsNullOrEmpty(Type) ? "" : $"{Type}: ",
      Message,
      string.IsNullOrEmpty(ScriptStackTrace) ? "" : $"\n{ScriptStackTrace}",
      string.IsNullOrEmpty(StackTrace) ? "" : $"\n\n{StackTrace}"
    );
}
