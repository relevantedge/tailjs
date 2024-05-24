// ReSharper disable UnusedMember.Global

using System.Collections.Concurrent;
using Microsoft.ClearScript;
using Microsoft.ClearScript.V8;

namespace TailJs.Scripting;

internal class Timeouts : IScriptEngineExtension
{
  private readonly Action<Exception>? _exceptionHandler;

  private readonly ConcurrentDictionary<long, CancellationTokenSource> _timeouts = new();

  private long _nextId = 0;

  public Timeouts(Action<Exception>? exceptionHandler = null)
  {
    _exceptionHandler = exceptionHandler;
  }

  public void ClearTimeout(long id)
  {
    if (_timeouts.TryRemove(id, out var registration))
    {
      if (!registration.IsCancellationRequested)
      {
        registration.Cancel();
      }
      registration.Dispose();
    }
  }

  public long SetTimeout(V8ScriptEngine source, ScriptObject callback, object? delay, int currentId)
  {
    var id = currentId > 0 ? currentId : Interlocked.Increment(ref _nextId);
    var cts = new CancellationTokenSource();
    _timeouts.TryAdd(id, cts);

    _ = Dispatch();
    return id;

    async Task Dispatch()
    {
      CancellationTokenSource? cancellation = null;
      try
      {
        await Task.Delay(Convert.ToInt32(delay), cts.Token).ConfigureAwait(false);
        if (_timeouts.TryRemove(id, out var registration) && !registration.IsCancellationRequested)
        {
          (cancellation = registration).Cancel();
          callback.Invoke(false);
        }
      }
      catch (Exception ex)
      {
        _exceptionHandler?.Invoke(ex);
      }
      finally
      {
        cancellation?.Dispose();
      }
    }
  }

  #region IScriptEngineExtension Members

  public void Dispose()
  {
    foreach (var kv in _timeouts.ToList())
    {
      if (_timeouts.TryRemove(kv.Key, out var registration))
      {
        if (!registration.IsCancellationRequested)
        {
          registration.Cancel();
        }

        registration.Dispose();
      }
    }
  }

  public async ValueTask<ScriptObject?> SetupAsync(
    V8ScriptEngine engine,
    IResourceManager resources,
    CancellationToken cancellationToken = default
  )
  {
    var script =
      await resources.ReadTextAsync("js/timeouts.js", null, cancellationToken).ConfigureAwait(false)
      ?? throw new InvalidOperationException("The embedded script for timeouts could not be loaded.");

    ((ScriptObject)engine.Evaluate(script)).Invoke(false, this, engine);
    return null;
  }

  #endregion
}
