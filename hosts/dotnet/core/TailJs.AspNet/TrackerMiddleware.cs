﻿using System.Text;
using System.Text.Json;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.ClearScript;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace TailJs.AspNet;

public class TrackerMiddleware
{
  private static long _requestCount;

  public static long RequestCount => _requestCount;

  public static TimeSpan Elapsed => Timer.Elapsed;

  private static readonly ConcurrentStopwatch Timer = new();
  private readonly RequestDelegate _next;

  public TrackerMiddleware(RequestDelegate next)
  {
    _next = next;
  }

  public async Task InvokeAsync(
    HttpContext context,
    IOptions<TrackerConfiguration> configuration,
    IRequestHandler? requestHandler = null,
    ILogger<TrackerMiddleware>? logger = null
  )
  {
    if (
      requestHandler == null
      || configuration.Value.Disable
      || (Path.GetExtension(context.Request.Path) is { } ext && !string.IsNullOrEmpty(ext) && ext != ".js") // Do not intercept requests to static resources
    )
    {
      await _next(context);
      return;
    }

    using var sw = Timer.StartNew();

    try
    {
      var trackerContext = await requestHandler.ProcessRequestAsync(
        new ClientRequest(
          context.Request.Method,
          context.Request.GetEncodedUrl(),
          context.Request.Headers
            .Select(header => new KeyValuePair<string, string>(header.Key, header.Value!))
            .Where(kv => !string.IsNullOrEmpty(kv.Value)),
          async () => await new StreamReader(context.Request.Body).ReadToEndAsync(),
          //"87.62.100.252"
          context.Request.Headers["X-Forwarded-For"].ToString()
            is { Length: > 0 } forwarded
            ? forwarded
            : context.Connection.RemoteIpAddress?.ToString()
        )
      );
      if (trackerContext == null)
      {
        sw.Stop();
        await _next(context);
        return;
      }

      context.RequestServices.GetRequiredService<ITrackerAccessor>().Tracker = trackerContext.Tracker;
      //context.RequestServices.GetRequiredService<ITrackerAccessor>().Environment = trackerContext.Tracker;

      void AppendCookies(IEnumerable<ClientResponseCookie> cookies)
      {
        foreach (var cookie in cookies)
        {
          context.Response.Headers.Append("Set-Cookie", cookie.HeaderString);
        }
      }

      if (trackerContext.Response is { } response)
      {
        foreach (var header in response.Headers)
        {
          context.Response.Headers[header.Key] = header.Value;
        }

        AppendCookies(response.Cookies);

        context.Response.StatusCode = response.HttpStatus;
        if (response.Body is { } bytes)
        {
          sw.Stop();
          await context.Response.Body.WriteAsync(bytes, 0, bytes.Length);
        }

        return;
      }

      context.RequestAborted.Register(() => requestHandler?.Dispose());

      context.Response.OnStarting(() =>
      {
        var sw = Timer.StartNew();
        if (_requestCount < 25)
        {
          sw.Stop();
        }

        try
        {
          AppendCookies(requestHandler.GetClientCookies(trackerContext.Tracker));
        }
        finally
        {
          sw.Stop();
        }
        //Interlocked.Add(ref _elapsed, sw.Elapsed.Ticks);

        return Task.CompletedTask;
      });

      sw.Stop();
      await _next(context);
    }
    catch (ScriptEngineException ex)
    {
      logger?.LogError(ex, "An error occurred.");
      throw new InvalidOperationException(ex.ErrorDetails, ex);
    }
    finally
    {
      Interlocked.Increment(ref _requestCount);
    }
  }
}