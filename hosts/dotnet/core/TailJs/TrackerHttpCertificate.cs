using Microsoft.ClearScript;

using TailJs.Scripting;

namespace TailJs;

public class TrackerHttpCertificate
{
  public TrackerHttpCertificate(string id, TrackerHttpContent content, string? key)
  {
    Id = id;
    Content = content;
    Key = key;
  }

  [ScriptMember("id")]
  public string Id { get; set; }

  [ScriptMember("content")]
  internal object? MappedContent { get; set; }

  public TrackerHttpContent Content { get; private set; }

  [ScriptMember("key")]
  public string? Key { get; set; }

  internal void Map(Uint8ArrayConverter converter) => MappedContent = Content.Map(converter);

  internal void Unmap() => Content = TrackerHttpContent.Unmap(MappedContent);
}
