// ReSharper disable UnusedMember.Global

using Microsoft.ClearScript;

namespace TailJs.Scripting;

public class Tracker : ITracker
{
  internal RequestHandler RequestHandler { get; }

  internal Tracker(RequestHandler requestHandler, IScriptObject scriptHandle, ITrackerEnvironment environment)
  {
    RequestHandler = requestHandler;
    ScriptHandle = scriptHandle;
    Environment = environment;
    Cookies = new CookieCollection((IScriptObject)scriptHandle["cookies"]);
    Variables = new TrackerVariableCollection(requestHandler.Proxy, scriptHandle);
  }

  internal IScriptObject ScriptHandle { get; }

  #region ITracker Members

  public ICookieCollection Cookies { get; }

  public string Url => (string)ScriptHandle["url"];

  public ITrackerEnvironment Environment { get; }

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
