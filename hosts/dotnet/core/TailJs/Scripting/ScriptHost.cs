// ReSharper disable UnusedMember.Global

using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

using Microsoft.ClearScript;
using Microsoft.ClearScript.JavaScript;
using Microsoft.ClearScript.V8;
using Microsoft.Extensions.Logging;

namespace TailJs.Scripting;

internal class ScriptHost : IScriptEngineExtension
{
  private readonly IResourceLoader _resources;

  private readonly IScriptLoggerFactory? _loggerFactory;
  private readonly Uint8ArrayConverter _uint8Converter;
  private readonly CancellationToken _hostDisposed;

  public ScriptHost(
    IResourceLoader resources,
    IScriptLoggerFactory? loggerFactory,
    Uint8ArrayConverter uint8Converter,
    CancellationToken hostDisposed
  )
  {
    _resources = resources;
    _loggerFactory = loggerFactory;
    _uint8Converter = uint8Converter;
    _hostDisposed = hostDisposed;
  }

  internal PromiseLike<object?> Request(ScriptObject request, ScriptObject response)
  {
    return Inner().AsPromiseLike();

    async Task<object?> Inner()
    {
      try
      {
        var binary = request.Get<bool?>("binary") == true;
        var httpRequest = new HttpRequestMessage();
        httpRequest.RequestUri = new Uri(
          request.Get<string?>("url") ?? throw new ArgumentException("URL is missing.")
        );
        httpRequest.Method = new HttpMethod(request.Get<string?>("method") ?? "GET");

        var contentType = (string?)null;
        foreach (var header in request.Enumerate("headers"))
        {
          if (header.Value is not string value)
            continue;

          if (header.Key == "content-type")
          {
            contentType = value;
            continue;
          }

          httpRequest.Headers.Add(header.Key, value);
        }

#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER
        httpRequest.Headers.Add("accept-encoding", "gzip, deflate, br");
#else
        httpRequest.Headers.Add("accept-encoding", "gzip, deflate");
#endif
        if (request["body"] is ITypedArray bytes)
        {
          httpRequest.Content = new ByteArrayContent(bytes.GetBytes());
        }
        else if (request.Get<string?>("body") is { } body)
        {
          httpRequest.Content = new StringContent(body, Encoding.UTF8, contentType ?? "application/json");
        }

        using var client =
          request.Get("x509") is IScriptObject x509
          && (x509.Get("cert") as ITypedArray<byte>)?.ToArray() is { } cert
            ? Pools.GetHttpClient(
              x509.Require<string>("id"),
              handler =>
              {
                handler.ClientCertificates.Add(
                  x509.Get<string>("key") is { } key
                    ? new X509Certificate2(cert, key)
                    : new X509Certificate2(cert)
                );
              }
            )
            : Pools.GetHttpClient();

        var httpResponse = await client.Instance.SendAsync(httpRequest, _hostDisposed).ConfigureAwait(false);

        var headers = (IScriptObject)response["headers"];
        var cookies = ((IScriptObject)response["cookies"]);
        foreach (var header in httpResponse.Headers)
        {
          var name = header.Key.ToLowerInvariant();
          if (name == "set-cookie")
          {
            var i = 0;
            foreach (var cookie in header.Value)
            {
              cookies[i++] = cookie;
            }
          }
          else
          {
            headers[name] = string.Join(",", header.Value);
          }
        }

        response["status"] = (int)httpResponse.StatusCode;
        response["body"] = binary
          ? _uint8Converter.FromBytes(
            await httpResponse.Content.ReadAsByteArrayAsync(
#if NET7_0_OR_GREATER
              _hostDisposed
#endif
            )
          )
          : await httpResponse.Content.ReadAsStringAsync(
#if NET7_0_OR_GREATER
            _hostDisposed
#endif
          );

        return response;
      }
      catch (Exception ex)
      {
        return ex.ToString();
      }
    }
  }

  internal PromiseLike<object?> Read(string path, object? changeHandler, bool text)
  {
    var wrappedHandler = changeHandler is IScriptObject handler
      ? text
        ? (object)
          (ChangeHandler<string>)(
            async (path, data) =>
              await handler
                .InvokeAsFunction(
                  path,
                  (Func<PromiseLike<string?>>)(() => data(_hostDisposed).AsTask().AsPromiseLike())
                )
                .ToTask()
                .ConfigureAwait(false)
                is true
          )
        : (ChangeHandler<byte[]>)(
          async (path, data) =>
            await handler
              .InvokeAsFunction(
                path,
                (Func<PromiseLike<object?>>)(() => ConvertResultAsync(data(_hostDisposed)).AsPromiseLike())
              )
              .ToTask()
              .ConfigureAwait(false)
              is true
        )
      : null;

    return Inner().AsPromiseLike();

    async Task<object?> Inner() =>
      text
        ? await _resources.ReadTextAsync(path, (ChangeHandler<string>?)wrappedHandler, _hostDisposed)
        : await ConvertResultAsync(
          _resources.ReadAsync(path, (ChangeHandler<byte[]>?)wrappedHandler, _hostDisposed)
        );

    async Task<object?> ConvertResultAsync(ValueTask<byte[]?> read) =>
      await read.ConfigureAwait(false) is not { } data ? null : _uint8Converter.FromBytes(data);
  }

  internal void Log(string messageJson)
  {
    try
    {
      var message = JsonSerializer.Deserialize<LogMessage>(
        messageJson,
        new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
      )!;

      var logMessage =
        $"{(string.IsNullOrEmpty(message.Source) ? "" : $"{message.Source}: ")}{
          (
            (message.Data as JsonValue)?.TryGetValue<string>(out var stringMessage) == true
              ? stringMessage
              : message.Data?.ToJsonString(new JsonSerializerOptions { WriteIndented = true }) ?? "(null)"
          )
        }";
      if ((_loggerFactory?.GetLogger(message.Group!)) is { } logger)
      {
        logger.Log(message.Level, logMessage);
      }
      else
      {
        Console.Out.WriteLine($"{message.Level}: {message.Data ?? "(undefined)"}");
      }
    }
    catch (Exception ex)
    {
      _loggerFactory?.DefaultLogger.LogError(ex, "Malformed log message.");
    }
  }

  #region IScriptEngineExtension Members

  public void Dispose() { }

  public async ValueTask<ScriptObject?> SetupAsync(
    V8ScriptEngine engine,
    IResourceLoader resources,
    CancellationToken cancellationToken = default
  )
  {
    var script =
      await resources.ReadTextAsync("js/host.js", null, cancellationToken).ConfigureAwait(false)
      ?? throw new InvalidOperationException("The embedded script for the host wrapper could not be loaded.");

    return (ScriptObject)((ScriptObject)engine.Evaluate(script)).Invoke(false, this, engine);
  }

  #endregion
}
