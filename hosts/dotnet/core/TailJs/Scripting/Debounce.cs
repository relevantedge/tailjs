namespace TailJs;

internal class Debounce : IDisposable
{
  private readonly Func<CancellationToken, ValueTask> _action;
  private readonly TimeSpan _delay;
  private long _generation;

  public Debounce(Func<CancellationToken, ValueTask> action, TimeSpan delay)
  {
    _action = action;
    _delay = delay;
  }

  public async ValueTask Invoke(CancellationToken cancellationToken = default)
  {
    var currentGeneration = Interlocked.Increment(ref _generation);
    await Task.Delay(_delay, cancellationToken).ConfigureAwait(false);
    if (_generation == currentGeneration)
    {
      await _action(cancellationToken).ConfigureAwait(false);
    }
  }

  public void Dispose()
  {
    Interlocked.Increment(ref _generation);
  }
}
