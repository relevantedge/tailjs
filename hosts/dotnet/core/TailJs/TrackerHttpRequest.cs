using Microsoft.ClearScript;

using TailJs.Scripting;

namespace TailJs;

public class TrackerHttpRequest : TrackerHttpMessage
{
  public TrackerHttpRequest(
    string url,
    string? method = null,
    bool binary=false,
    TrackerHttpContent? body = null,
    IEnumerable<KeyValuePair<string, string>>? headers = null,
    TrackerHttpCertificate? certificate = null
  ) : base(body, headers)
  {
    Url = url;
    Method = method;
    IsBinary = binary;
    Certificate = certificate;
  }

  [ScriptMember("url")]
  public string Url { get; set; }

  [ScriptMember("binary")]
  public bool IsBinary { get; set; }
  
  [ScriptMember("method")]
  public string? Method { get; set; }

  [ScriptMember("x509")]
  public TrackerHttpCertificate? Certificate { get; }

  internal TrackerHttpRequest Map(Uint8ArrayConverter converter)
  {
    MapBody(converter);
    Certificate?.Map(converter);
    return this;
  }

  internal TrackerHttpRequest Unmap()
  {
    UnmapBody();
    Certificate?.Unmap();
    return this;
  }
}
