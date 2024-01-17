using Microsoft.ClearScript;

using TailJs.Scripting;

namespace TailJs;

public abstract class TrackerHttpMessage
{
  protected TrackerHttpMessage(TrackerHttpContent? body, IEnumerable<KeyValuePair<string, string>>? headers)
  {
    Body = body;
    Headers = AsDictionary(headers);
  }

  public TrackerHttpContent? Body { get; set; }

  [ScriptMember("body")]
  internal object? MappedBody { get; set; }

  [ScriptMember("headers")]
  public Dictionary<string, string> Headers { get; set; }

  protected void MapBody(Uint8ArrayConverter converter) => MappedBody = Body?.Map(converter);

  protected void UnmapBody() => Body = TrackerHttpContent.Unmap(MappedBody);

  protected static Dictionary<string, T> AsDictionary<T>(IEnumerable<KeyValuePair<string, T>>? values) =>
    values as Dictionary<string, T>
    ?? (values == null ? new Dictionary<string, T>() : values.ToDictionary(kv => kv.Key, kv => kv.Value));
}
