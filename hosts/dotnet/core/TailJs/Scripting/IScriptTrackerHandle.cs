using Microsoft.ClearScript;

namespace TailJs.Scripting;

internal interface IScriptTrackerHandle : ITrackerHandle
{
  public IScriptObject ScriptHandle { get; }

  public Tracker? Resolved { get; }
}

internal class ScriptTrackerHandle : IScriptTrackerHandle
{
  public IScriptObject ScriptHandle { get; }

  public Tracker? Resolved { get; private set; }

  public ScriptTrackerHandle(IScriptObject scriptHandle)
  {
    ScriptHandle = scriptHandle;

    scriptHandle.Attach<IScriptTrackerHandle>(this);
  }

  public async ValueTask<ITracker> ResolveAsync(CancellationToken cancellationToken = default)
  {
    if (Resolved != null)
      return Resolved;

    if (
      (
        ScriptHandle.GetScriptValue("resolved")
        ?? await ScriptHandle.InvokeAsFunction().AwaitScript(cancellationToken)
      )
      is not IScriptObject handle
    )
    {
      throw new InvalidOperationException("The tracker could not be resolved.");
    }

    return Resolved = new Tracker(handle);
  }
}
