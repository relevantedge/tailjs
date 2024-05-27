// ReSharper disable UnusedMember.Global

using Microsoft.ClearScript;

namespace TailJs.Scripting;

internal class Tracker : ITracker, IScriptTrackerHandle
{
  internal Tracker(IScriptObject scriptHandle)
  {
    RequestHandler = scriptHandle.RequireAttachment<RequestHandler>();
    ScriptHandle = scriptHandle;
    Environment = RequestHandler.Environment;
    Cookies = new CookieCollection((IScriptObject)scriptHandle["cookies"]);
    Variables = new TrackerVariableCollection(RequestHandler.Proxy, scriptHandle);

    scriptHandle.Attach<ITracker>(this);
    scriptHandle.Attach<ITrackerHandle>(this);
  }

  internal RequestHandler RequestHandler { get; }

  #region IScriptTrackerHandle Members

  public Tracker Resolved => this;

  public IScriptObject ScriptHandle { get; }

  public ValueTask<ITracker> ResolveAsync(CancellationToken cancellationToken = default) => new(this);

  #endregion


  #region ITracker Members

  public ICookieCollection Cookies { get; }

  public ITrackerEnvironment Environment { get; }

  public string Url => (string)ScriptHandle["url"];

  public ITrackerVariableCollection Variables { get; }

  public async Task<TrackerHttpResponse> ForwardRequestAsync(
    TrackerHttpRequest request,
    CancellationToken cancellationToken = default
  )
  {
    var response = await ScriptHandle
      .InvokeMethod("forwardRequest", request.Map(RequestHandler.Uint8ArrayConverter))
      .AwaitScript(cancellationToken)
      .ConfigureAwait(false);

    return TrackerHttpResponse.FromScriptObject(response);
  }

  public async Task PostEventsAsync(
    IEnumerable<string> jsonEvents,
    CancellationToken cancellationToken = default
  )
  {
    await RequestHandler
      .PostEventsAsync(
        this,
        $"[{string.Join(",", jsonEvents.Select(ev => ev.ToString()))}]",
        cancellationToken
      )
      .ConfigureAwait(false);
  }

  #endregion
}
