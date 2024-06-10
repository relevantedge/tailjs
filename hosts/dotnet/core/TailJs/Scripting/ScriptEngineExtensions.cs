using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using Microsoft.ClearScript;

#pragma warning disable CS8974

namespace TailJs.Scripting;

internal static class ScriptEngineExtensions
{
  public static object AsPromiseLike(this ValueTask task) =>
    task.IsCompletedSuccessfully ? Undefined.Value : task.AsTask().AsPromiseLike();

  public static object AsPromiseLike(this Task task) =>
    task.IsCompleted
      ? task.Status == TaskStatus.RanToCompletion
        ? Undefined.Value
        : throw task.Exception ?? new Exception("The task failed for unspecified reasons 🤷‍♀️.")
      : new PromiseLike<Undefined>(
        task.ContinueWith(task =>
          task.Status == TaskStatus.RanToCompletion
            ? Undefined.Value
            : throw task.Exception ?? new Exception("The task failed for unspecified reasons 🤷‍♀️.")
        )
      );

  public static object? AsPromiseLike<T>(this ValueTask<T> task) =>
    task.IsCompleted ? task.Result : new PromiseLike<T>(task.AsTask());

  public static object? AsPromiseLike<T>(this Task<T> task) =>
    task.IsCompleted ? task.Result : new PromiseLike<T>(task);

  public static IEnumerable<T> EnumerateScriptValues<T>(
    this object? scriptValue,
    Func<object?, T> projection
  ) => scriptValue.EnumerateScriptValues().Select(kv => projection(kv.Value));

  public static IEnumerable<T> EnumerateScriptValues<T>(
    this object? scriptValue,
    Func<string, object?, T> projection
  ) => scriptValue.EnumerateScriptValues().Select(kv => projection(kv.Key, kv.Value));

  public static IEnumerable<T> EnumerateScriptValues<T>(
    this object? scriptValue,
    Func<string, object?, int, T> projection
  ) => scriptValue.EnumerateScriptValues().Select((kv, i) => projection(kv.Key, kv.Value, i));

  public static IEnumerable<KeyValuePair<string, object?>> EnumerateScriptValues(this object? scriptValue)
  {
    if (scriptValue == null || scriptValue == Undefined.Value)
      yield break;

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

  public static IEnumerable<KeyValuePair<string, object?>> EnumerateScriptValues(
    this object? scriptObject,
    params string[] path
  ) => (scriptObject.GetScriptValue(path) as IScriptObject).EnumerateScriptValues();

  private static Exception MissingOrWrongValueException(string? property, string? valueType) =>
    new InvalidCastException(
      $"A {valueType} value is missing{(property != null ? $" for the property '{property}'" : "")}."
    );

  public static DateTime RequireScriptDateTime(this object? value, string? property = null) =>
    value.TryGetScriptDateTime(property) ?? throw MissingOrWrongValueException(property, "date time");

  public static DateTime? TryGetScriptDateTime(this object? value, string? property = null) =>
    value is DateTime datetime
      ? datetime
      : property.TryGetScriptInteger(property) is { } timestamp
        ? DateTimeOffset.FromUnixTimeMilliseconds(timestamp).DateTime
        : value.GetScriptValue("valueOf") is IScriptObject method
          ? method.InvokeAsFunction().TryGetScriptDateTime()
          : null;

  public static TimeSpan RequireScriptTimeSpan(this object? value, string? property = null) =>
    value.TryGetTimeSpan(property) ?? throw MissingOrWrongValueException(property, "time span");

  public static TimeSpan? TryGetTimeSpan(this object? value, string? property = null) =>
    value is TimeSpan timespan
      ? timespan
      : property.TryGetScriptInteger(property) is { } timestamp
        ? TimeSpan.FromMilliseconds(timestamp)
        : null;

  public static T GetScriptValue<T>(this object? value) => (T)value.GetScriptValue()!;

  public static T? TryGetScriptValue<T>(this object? value, string? property = null)
    where T : struct => value.GetScriptValue(property) is { } typedValue ? (T)typedValue : null;

  public static T GetScriptValue<T>(this object? value, string? property) =>
    (T)value.GetScriptValue(property)!;

  public static T GetScriptValue<T>(this object? value, params string[] path) =>
    (T)value.GetScriptValue(path)!;

  public static long RequireScriptInteger(this object? value, string? property = null) =>
    value.TryGetScriptInteger(property) ?? throw MissingOrWrongValueException(property, "integer");

  public static long? TryGetScriptInteger(this object? value, string? property = null) =>
    value.GetScriptValue(property) switch
    {
      int numeric => numeric,
      long numeric => numeric,
      // ReSharper disable once CompareOfFloatsByEqualityOperator
      double numeric => Math.Round(numeric) == numeric ? (long)numeric : null,
      string parsable
        => long.TryParse(parsable, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed)
          ? parsed
          : null,
      _ => null
    };

  public static double RequireScriptDouble(this object? value, string? property = null) =>
    value.TryGetScriptDouble(property) ?? throw MissingOrWrongValueException(property, "double");

  public static double? TryGetScriptDouble(this object? value, string? property = null) =>
    value.GetScriptValue(property) switch
    {
      int numeric => numeric,
      long numeric => numeric,
      // ReSharper disable once CompareOfFloatsByEqualityOperator
      double numeric => numeric,
      string parsable
        => double.TryParse(parsable, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed)
          ? parsed
          : null,
      _ => null
    };

  public static ScriptError? GetScriptError(this object? value, string? property = null) =>
    (value = value.GetScriptValue()) switch
    {
      null => null,
      IScriptObject scriptObject when scriptObject.GetScriptValue("message") is string message
        => new ScriptError(
          message,
          scriptObject.GetScriptValue("name") as string,
          scriptObject.GetScriptValue("stack") as string
        ),
      string message => new ScriptError(message),
      _ => new ScriptError(value.ToString())
    };

  public static object? GetScriptValue(this object? value) => value is Undefined ? null : value;

  public static object? GetScriptValue(this object? value, string? property) =>
    property == null ? property : (value as IScriptObject)?[property].GetScriptValue();

  public static T[]? GetScriptArray<T>(this object? value, string? property = null) =>
    value as T[]
    ?? (
      value.GetScriptValue(property) is not { } propertyValue
        ? null
        : propertyValue.EnumerateScriptValues(value => value.GetScriptValue<T>()).ToArray()
    );

  public static object? GetScriptValue(this object? value, params string[] path)
  {
    foreach (var fragment in path)
    {
      if (value == null)
      {
        return null;
      }

      value = value.GetScriptValue(fragment);
    }

    return value.GetScriptValue();
  }

  public static T RequireScriptValue<T>(this object? value, string path)
    where T : notnull =>
    value.GetScriptValue(path) is { } nonNull
      ? (T)nonNull
      : throw new NullReferenceException(
        path.Length > 0
          ? $"The property '{string.Join(".", path)}' is null or undefined."
          : "The value is null or undefined."
      );

  public static T RequireScriptValue<T>(this object? value, params string[] path)
    where T : notnull =>
    value.GetScriptValue(path) is { } nonNull
      ? (T)nonNull
      : throw new NullReferenceException(
        path.Length > 0
          ? $"The property '{string.Join(".", path)}' is null or undefined."
          : "The value is null or undefined."
      );

  private static string FormatError(object? error)
  {
    if (error == null)
      return "(unspecified error)";
    if (error is IScriptObject errorObject)
    {
      var stack = errorObject.GetProperty("stack")?.ToString();
      return $"{errorObject.InvokeMethod("toString")}{(string.IsNullOrEmpty(stack) ? "" : $"\n{stack}")}";
    }

    return "" + error;
  }

  public static async ValueTask<object?> AwaitScript(
    this object? scriptObject,
    CancellationToken cancellationToken = default
  )
  {
    if (scriptObject is not IScriptObject thenable || thenable["then"] is not IScriptObject)
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
                $"An error occurred while awaiting a promise: {FormatError(err)} "
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

  public static void Attach<T>(this IScriptObject scriptObject, T instance)
    where T : class => scriptObject[$"__net__{typeof(T).Name}"] = instance;

  public static T RequireAttachment<T>(this IScriptObject? scriptObject, string? property = null)
    where T : class =>
    scriptObject.TryGetAttachment<T>(property)
    ?? throw new NullReferenceException($"No {typeof(T).Name} is associated with the specified object");

  public static T? TryGetAttachment<T>(this IScriptObject? scriptObject, string? property = null)
    where T : class => scriptObject?[$"__net__{typeof(T).Name}"] as T;

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
