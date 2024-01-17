using Microsoft.ClearScript;

using TailJs.Scripting;

namespace TailJs;

public class TrackerHttpResponse : TrackerHttpMessage
{
  public TrackerHttpResponse(
    TrackerHttpContent? body,
    IEnumerable<KeyValuePair<string, string>>? headers,
    IEnumerable<KeyValuePair<string, TrackerCookie>>? cookies = null
  ) : base(body, headers)
  {
    Cookies = AsDictionary(cookies?.Select(kv => new KeyValuePair<string, TrackerCookie>(kv.Key, kv.Value)));
  }

  [ScriptMember("cookies")]
  public Dictionary<string, TrackerCookie> Cookies { get; }

  public TrackerHttpResponse Map(Uint8ArrayConverter uint8ArrayConverter)
  {
    MapBody(uint8ArrayConverter);
    return this;
  }

  public TrackerHttpResponse Unmap()
  {
    UnmapBody();
    return this;
  }

  internal static TrackerHttpResponse FromScriptObject(object? response) =>
    new TrackerHttpResponse(
      (string?)response.Get("body"),
      response
        .Enumerate("headers")
        .Select((kv) => new KeyValuePair<string, string>(kv.Key, (string)kv.Value!)),
      response
        .Enumerate("cookies")
        .Select(
          value =>
            new KeyValuePair<string, TrackerCookie?>(value.Key, CookieCollection.TryMapCookie(value.Value))
        )
        .Where(cookie => cookie.Value != null)!
    ).Unmap();
}
