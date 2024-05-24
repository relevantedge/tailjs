using Microsoft.ClearScript;

namespace TailJs.Scripting;

internal interface IScriptTrackerHandle : ITrackerHandle
{
  public IScriptObject ScriptHandle { get; }

  public Tracker? Resolved { get; }
}

internal class ScriptTrackerHandle : IScriptTrackerHandle
{
  private readonly RequestHandler _requestHandler;

  public IScriptObject ScriptHandle { get; }

  public Tracker? Resolved { get; private set; }

  public ScriptTrackerHandle(RequestHandler requestHandler, IScriptObject scriptHandle)
  {
    _requestHandler = requestHandler;
    ScriptHandle = scriptHandle;
  }

  public async ValueTask<ITracker> ResolveAsync(CancellationToken cancellationToken = default)
  {
    if (Resolved != null)
      return Resolved;

    if (
      (ScriptHandle.Get("resolved") ?? await ScriptHandle.InvokeAsFunction().AwaitScript(cancellationToken))
      is not IScriptObject handle
    )
    {
      throw new InvalidOperationException("The tracker could not be resolved.");
    }
    return Resolved = new Tracker(_requestHandler, handle);
  }
}
