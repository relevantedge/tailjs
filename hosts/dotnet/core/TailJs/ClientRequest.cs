// ReSharper disable UnusedMember.Global

using System.Net.Http;
using Microsoft.ClearScript;
using TailJs.IO;
using TailJs.Scripting;

namespace TailJs;

public class ClientRequest
{
  private readonly Func<ValueTask<ArrayBuffer<byte>?>>? _payload;

  private Uint8ArrayConverter? _arrayConverter;

  private object? _bytes;

  public ClientRequest(
    string method,
    string? url,
    IEnumerable<KeyValuePair<string, string>>? headers = null,
    Func<ValueTask<ArrayBuffer<byte>?>>? payload = null,
    string? clientIp = null
  )
  {
    _payload = payload;
    Method = method;
    Url = url;
    Headers = (
      headers as IReadOnlyDictionary<string, string>
      ?? (headers?.ToDictionary(kv => kv.Key, kv => kv.Value) ?? new())
    ).ToPropertyBag();

    ClientIp = clientIp;
  }

  [ScriptMember("method")]
  public string Method { get; }

  [ScriptMember("url")]
  public string? Url { get; }

  [ScriptMember("headers")]
  public PropertyBag Headers { get; }

  [ScriptMember("clientIp")]
  public string? ClientIp { get; }

  internal ClientRequest Attach(Uint8ArrayConverter arrayConverter)
  {
    _arrayConverter = arrayConverter;
    return this;
  }

  [ScriptMember("payload")]
  public object? Payload() =>
    _payload == null
      ? null
      : _bytes ??= PromiseLike.Wrap(async () =>
      {
        if (await _payload() is not { } payload)
        {
          return null;
        }

        try
        {
          return (
            _arrayConverter
            ?? throw new InvalidOperationException(
              "A Uint8Array converter has not been associated with this client request."
            )
          ).FromBytes(payload.Buffer);
        }
        finally
        {
          payload.Dispose();
        }
      })();

  public static ClientRequest FromRequestMessageAsync(HttpRequestMessage request, string? clientIp = null) =>
    new(
      request.Method.ToString().ToUpperInvariant(),
      request.RequestUri?.ToString(),
      request.Headers.Select(header => new KeyValuePair<string, string>(
        header.Key,
        string.Join(",", header.Value)
      )),
      async () =>
        request.Content == null ? null : await (await request.Content.ReadAsStreamAsync()).ToByteArray(),
      clientIp
    );
}
