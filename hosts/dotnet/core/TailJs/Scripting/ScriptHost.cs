// ReSharper disable UnusedMember.Global

using System.Collections.Concurrent;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.ClearScript;
using Microsoft.ClearScript.JavaScript;
using Microsoft.ClearScript.V8;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

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
          ? _uint8Converter.FromBytes(await httpResponse.Content.ReadAsByteArrayAsync(
#if NET7_0_OR_GREATER
              _hostDisposed
#endif
            ))
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

  private readonly ConcurrentDictionary<
    string,
    (long LastEvent, int EpochCount, int TotalCount)
  > _logThrottleCounts = new();

  private static readonly JsonSerializerOptions LogJsonSerializerOptions = new() { WriteIndented = true };

  internal void Log(string messageJson)
  {
    try
    {
      var message = JsonSerializer.Deserialize<LogMessage>(
        messageJson,
        new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
      )!;

      var logMessage = new StringBuilder();
      if (!string.IsNullOrEmpty(message.Source))
      {
        logMessage.Append(message.Source).Append(": ");
      }
      logMessage.Append(message.Message);
      if (!string.IsNullOrEmpty(message.Group))
      {
        logMessage.Append($" #{message.Group}");
      }

      if (message.Details != null)
      {
        logMessage
          .AppendLine()
          .Append(
            Indent(
              sb => sb.Append("Details: ").Append(message.Details.ToJsonString(LogJsonSerializerOptions)),
              false
            )
          );
      }

      if (message.Error is { } error)
      {
        logMessage
          .AppendLine()
          .Append(
            Indent(sb =>
            {
              sb.Append("Error");
              if (error.Name is { Length: > 0 } name && name != "Error")
              {
                sb.Append(" (").Append(name).Append(")");
              }

              sb.Append(": ").Append(error.Message);
            })
          );

        if (error.Stack is { Length: > 0 } stack)
        {
          logMessage
            .AppendLine()
            .Append(
              Indent(sb =>
                sb.Append("Stack: ")
                  .Append(
                    Indent(
                      Regex.Replace(
                        stack,
                        @"^.*?(^\s*at.*)$",
                        "$1",
                        RegexOptions.Singleline | RegexOptions.Multiline
                      ),
                      false,
                      @"^\s*"
                    )
                  )
              )
            );
        }
      }

      if (message.ThrottleKey is { } throttleKey)
      {
        if (throttleKey == "")
        {
          throttleKey = Fnv1a(message.ToString());
        }

        var throttleStats = _logThrottleCounts.AddOrUpdate(
          throttleKey,
          (_) => (DateTime.UtcNow.Ticks, 0, 0),
          (_, current) =>
            current.LastEvent < DateTime.UtcNow.Add(TimeSpan.FromMinutes(1)).Ticks
              ? (current.LastEvent, current.EpochCount + 1, current.TotalCount + 1)
              : (DateTime.UtcNow.Ticks, 0, current.TotalCount + 1)
        );

        if (throttleStats.TotalCount >= 3)
        {
          logMessage
            .AppendLine()
            .Append("(This kind of event has occurred ")
            .Append(throttleStats.TotalCount.ToString("N0"))
            .Append(" times since start");
          if (throttleStats.EpochCount < 3)
          {
            logMessage.Append(".)");
          }
          if (throttleStats.EpochCount == 3)
          {
            logMessage
              .AppendLine()
              .AppendLine(" - further events of this kind will not be logged for the next minute.)");
          }
          else
          {
            return;
          }
        }
      }

      if (
        (
          string.IsNullOrEmpty(message.Group)
            ? _loggerFactory?.DefaultLogger
            : _loggerFactory?.GetLogger(message.Group)
        ) is
        { } logger
      )
      {
        logger.Log(message.Level, logMessage.ToString());
      }
      else
      {
        var formatted = $"{DateTime.UtcNow:o}{message.Level}: {logMessage}";
        if (message.Level < LogLevel.Warning)
        {
          Console.Out.WriteLine(formatted);
        }
        else
        {
          Console.Error.WriteLine(formatted);
        }
      }
    }
    catch (Exception ex)
    {
      _loggerFactory?.DefaultLogger.LogError(ex, "Malformed log message.");
    }
  }

  private static string Fnv1a(string text)
  {
    var hash = 14695981039346656037ul;
    var bytes = Encoding.UTF8.GetBytes(text).AsSpan();
    unchecked
    {
      foreach (var p in bytes)
      {
        hash = (ulong)(1099511628211L * ((long)hash ^ p));
      }
    }

    return Convert.ToBase64String(BitConverter.GetBytes(hash));
  }

  private static string Indent(Action<StringBuilder> text, bool indentFirst = true, string match = "^")
  {
    return Indent(
      sb =>
      {
        text(sb);
        return sb;
      },
      indentFirst,
      match
    );
  }

  private static string Indent(string text, bool indentFirst = true, string match = "^") =>
    Indent(sb => sb.Append(text), indentFirst, match);

  private static string Indent(
    Func<StringBuilder, StringBuilder> text,
    bool indentFirst = true,
    string match = "^"
  )
  {
    var indented = Regex.Replace(text(new StringBuilder()).ToString(), match, "  ", RegexOptions.Multiline);
    return indentFirst || indented.Length < 2 ? indented : indented.Substring(2);
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
