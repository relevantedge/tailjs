// ReSharper disable InconsistentNaming

namespace TailJs;

public abstract record ClientScript
{
  public static ClientScript External(string src, bool defer = true) => new ExternalScript(src, defer);

  public static ClientScript Inline(string script, bool allowReorder = true) =>
    new InlineScript(script, allowReorder);

  private sealed record ExternalScript(string src, bool defer) : ClientScript;

  private sealed record InlineScript(string script, bool allowReorder) : ClientScript;
}
