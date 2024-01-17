namespace TailJs.IO;

public class LambdaDisposer : IDisposable, IAsyncDisposable
{
  private Func<IDisposable, CancellationToken, ValueTask>? _endScope;
  private readonly CancellationToken _cancellationToken;

  public static LambdaDisposer Empty { get; } = new(null);

  public LambdaDisposer(Action<IDisposable>? endScope)
  {
    if (endScope != null)
    {
      _endScope = (disposable, _) =>
      {
        endScope(disposable);
        return default;
      };
    }

    _cancellationToken = default;
  }

  public LambdaDisposer(
    Func<IDisposable, CancellationToken, ValueTask>? endScope,
    CancellationToken cancellationToken = default
  )
  {
    _endScope = endScope;
    _cancellationToken = cancellationToken;
  }

  public void Dispose()
  {
    if (_endScope == null)
    {
      return;
    }

    var capturedEndScope = _endScope;
    _endScope = null;
    var task = capturedEndScope(this, _cancellationToken);
    if (!task.IsCompleted)
      throw new InvalidOperationException("The scope is asynchronous.");
    _endScope = null;
  }

  public async ValueTask DisposeAsync()
  {
    if (_endScope == null)
      return;
    var capturedEndScope = _endScope;
    _endScope = null;
    await capturedEndScope(this, _cancellationToken);
    _endScope = null;
  }
}
