namespace TailJs;

internal class EmptyDisposable : IDisposable, IAsyncDisposable
{
  private EmptyDisposable() { }

  public static EmptyDisposable Instance { get; } = new EmptyDisposable();

  #region IAsyncDisposable Members

  public ValueTask DisposeAsync() => new();

  #endregion


  #region IDisposable Members

  public void Dispose() { }

  #endregion
}

public class Disposable : IDisposable
{
  private readonly Action _dispose;
  private bool _disposed;

  public static IDisposable Empty { get; } = EmptyDisposable.Instance;

  public Disposable(Action dispose) => _dispose = dispose;

  #region IDisposable Members

  public void Dispose()
  {
    if (_disposed == (_disposed = true))
    {
      return;
    }

    _dispose();
  }

  #endregion
}

public class AsyncDisposable : IAsyncDisposable
{
  private readonly Func<ValueTask> _dispose;
  private bool _disposed;

  public static IAsyncDisposable Empty { get; } = EmptyDisposable.Instance;

  public AsyncDisposable(Func<ValueTask> dispose) => _dispose = dispose;

  #region IAsyncDisposable Members

  public ValueTask DisposeAsync() => _disposed == (_disposed = true) ? default : _dispose();

  #endregion
}

public static class DisposableHelpers
{
  public static ValueTask TryDisposeAsync(this IAsyncDisposable? disposable) =>
    disposable?.DisposeAsync() ?? new();

  public static IAsyncDisposable DisposeIfNeededAsync<T>(this T? any, out T? value) where T : IAsyncDisposable
  {
    value = any;
    return any as IAsyncDisposable ?? AsyncDisposable.Empty;
  }

  public static IDisposable DisposeIfNeeded<T>(this T? any, out T? value) where T : IDisposable
  {
    value = any;
    return any as IDisposable ?? Disposable.Empty;
  }
}
