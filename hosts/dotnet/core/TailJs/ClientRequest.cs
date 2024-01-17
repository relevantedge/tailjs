// ReSharper disable UnusedMember.Global

using System.Net.Http;

using Microsoft.ClearScript;

using TailJs.Scripting;

namespace TailJs;

public class ClientRequest
{
  public ClientRequest(
    string method,
    string? url,
    IEnumerable<KeyValuePair<string, string>>? headers = null,
    Func<Task<string?>>? payload = null,
    string? clientIp = null
  )
  {
    Method = method;
    Url = url;
    Headers = (
      headers as IReadOnlyDictionary<string, string>
      ?? (headers?.ToDictionary(kv => kv.Key, kv => kv.Value) ?? new())
    ).ToPropertyBag();
    Payload = payload != null ? () => payload().AsPromiseLike() : null;
    ClientIp = clientIp;
  }

  [ScriptMember("method")]
  public string Method { get; }

  [ScriptMember("url")]
  public string? Url { get; }

  [ScriptMember("headers")]
  public PropertyBag Headers { get; }

  [ScriptMember("payload")]
  public Func<object>? Payload { get; }

  [ScriptMember("clientIp")]
  public string? ClientIp { get; }

  public static ClientRequest FromRequestMessageAsync(HttpRequestMessage request, string? clientIp = null) =>
    new(
      request.Method.ToString().ToUpperInvariant(),
      request.RequestUri?.ToString(),
      request.Headers.Select(
        header => new KeyValuePair<string, string>(header.Key, string.Join(",", header.Value))
      ),
      async () =>
        request.Content == null ? null : await request.Content.ReadAsStringAsync().ConfigureAwait(false),
      clientIp
    );
}
