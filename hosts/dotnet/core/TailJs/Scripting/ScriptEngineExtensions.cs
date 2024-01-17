using Microsoft.ClearScript;
using Microsoft.ClearScript.JavaScript;

#pragma warning disable CS8974

namespace TailJs.Scripting;

internal static class ScriptEngineExtensions
{
  public static PromiseLike<T> AsPromiseLike<T>(this Task<T> task) => new(task);

  public static IEnumerable<T> Enumerate<T>(this object? scriptValue, Func<object?, T> projection) =>
    scriptValue.Enumerate().Select(kv => projection(kv.Value));

  public static IEnumerable<T> Enumerate<T>(this object? scriptValue, Func<string, object?, T> projection) =>
    scriptValue.Enumerate().Select(kv => projection(kv.Key, kv.Value));

  public static IEnumerable<KeyValuePair<string, object?>> Enumerate(this object? scriptValue)
  {
    if (scriptValue is ICollection<object?> array)
    {
      var i = 0;
      foreach (var value in array)
      {
        yield return new KeyValuePair<string, object?>((i++).ToString(), value);
      }

      yield break;
    }

    if (scriptValue is not IScriptObject scriptObject)
    {
      yield break;
    }

    foreach (var name in scriptObject.PropertyNames)
    {
      var value = scriptObject[name];

      yield return new KeyValuePair<string, object?>(name, value is Undefined ? null : value);
    }
  }

  public static IEnumerable<KeyValuePair<string, object?>> Enumerate(
    this object? scriptObject,
    params string[] path
  ) => (scriptObject.Get(path) as IScriptObject).Enumerate();

  public static T Get<T>(this object? value) => (T)value.Get()!;

  public static T Get<T>(this object? value, params string[] path) => (T)value.Get(path)!;

  public static object? Get(this object? value) => value is Undefined ? null : value;

  public static object? Get(this object? value, params string[] path)
  {
    foreach (var fragment in path)
    {
      if (value == null)
      {
        return null;
      }

      value = (value as IScriptObject)?[fragment];
    }

    return value.Get();
  }

  public static T Require<T>(this object? value, params string[] path) where T : notnull =>
    value.Get(path) is { } nonNull
      ? (T)nonNull
      : throw new NullReferenceException(
        path.Length > 0
          ? $"The property '{string.Join(".", path)}' is null or undefined."
          : "The value is null or undefined."
      );

  public static PromiseLike<Undefined> AsPromiseLike(this Task task) =>
    new(
      task.ContinueWith(
        task =>
          task.Status == TaskStatus.RanToCompletion
            ? Undefined.Value
            : throw task.Exception ?? new Exception("The task failed for unspecified reasons 🤷‍♀️.")
      )
    );
  
  

  public static async ValueTask<object?> AwaitScript(
    this object? scriptObject,
    CancellationToken cancellationToken = default
  )
  {
    if (scriptObject is not IScriptObject thenable || thenable["then"] is not IScriptObject then)
    {
      return scriptObject;
    }

    var scriptTaskSource = new TaskCompletionSource<object?>(
      TaskCreationOptions.RunContinuationsAsynchronously
    );

    thenable.InvokeMethod(
      "then",
      (object? value) => scriptTaskSource.SetResult(value),
      (object? err) =>
        scriptTaskSource.SetException(
          err switch
          {
            Undefined
            or null
              => new ScriptEngineException("An unspecified script error occurred whilst awaiting a promise."),
            _
              => new ScriptEngineException(
                $"An error occurred whilst awaiting a promise: {(string?)(err as IScriptObject)?.InvokeMethod("toString") ?? err.ToString()}"
              ),
          }
        )
    );

#if NET5_0_OR_GREATER
    if (cancellationToken != default)
    {
      return await scriptTaskSource.Task.WaitAsync(cancellationToken);
    }
#else
    if (cancellationToken != default)
    {
      var cancelTask = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
      cancellationToken.Register(() => cancelTask.TrySetCanceled());

      var winner = await Task.WhenAny(scriptTaskSource.Task, cancelTask.Task).ConfigureAwait(false);
      if (winner == cancelTask.Task)
      {
        throw new OperationCanceledException();
      }
    }
#endif
    return await scriptTaskSource.Task.ConfigureAwait(false);
  }

  public static PropertyBag ToPropertyBag<T>(this IReadOnlyDictionary<string, T>? source)
  {
    var bag = new PropertyBag();
    if (source == null)
      return bag;
    foreach (var kv in source)
    {
      bag.Add(kv.Key, kv.Value);
    }

    return bag;
  }

  public static PropertyBag ToPropertyBag<T>(this IEnumerable<KeyValuePair<string, IEnumerable<T>>>? source)
  {
    var bag = new PropertyBag();
    if (source == null)
      return bag;
    foreach (var kv in source)
    {
      if (bag.TryGetValue(kv.Key, out var current))
      {
        bag[kv.Key] = ((T[])current).Concat(kv.Value).ToArray();
        continue;
      }
      bag.Add(kv.Key, kv.Value);
    }

    return bag;
  }

  public static async ValueTask<IDisposable> AcquireLockAsync(
    this SemaphoreSlim semaphore,
    CancellationToken cancellationToken = default
  )
  {
    await semaphore.WaitAsync(cancellationToken).ConfigureAwait(false);
    return new LockHandle(semaphore);
  }

  public static async Task<byte[]> ReadAsBytesAsync(
    this Stream stream,
    bool dispose = true,
    CancellationToken cancellationToken = default
  )
  {
    using var buffer = Pools.GetStream();
    await stream.CopyToAsync(buffer, 81920, cancellationToken).ConfigureAwait(false);
    if (dispose)
    {
      stream.Dispose();
    }
    return buffer.ToArray();
  }

  #region Nested type: LockHandle

  private class LockHandle : IDisposable
  {
    private readonly SemaphoreSlim _semaphore;

    public LockHandle(SemaphoreSlim semaphore)
    {
      _semaphore = semaphore;
    }

    #region IDisposable Members

    public void Dispose()
    {
      _semaphore.Release();
    }

    #endregion
  }

  #endregion
}
