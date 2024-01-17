using System.Diagnostics;

namespace TailJs.AspNet;

internal class ConcurrentStopwatch
{
  private long _active;
  private long _totalElapsed;
  private readonly Stopwatch _stopwatch = new();

  private SpinLock _timerLock;

  public TimeSpan Elapsed => _stopwatch.Elapsed;

  public TimeSpan TotalElapsedAllThreads => new(_totalElapsed);

  public Handle StartNew() => new Handle(this).Start();

  private void ToggleStopwatch(bool start)
  {
    var lockTaken = false;
    _timerLock.Enter(ref lockTaken);
    try
    {
      if (start)
      {
        if (Interlocked.Increment(ref _active) == 1)
        {
          _stopwatch.Start();
        }
      }
      else
      {
        if (Interlocked.Decrement(ref _active) == 0)
        {
          _stopwatch.Stop();
        }
      }
    }
    finally
    {
      if (lockTaken)
      {
        _timerLock.Exit();
      }
    }
  }

  #region Nested type: Handle

  public class Handle : IDisposable
  {
    private readonly ConcurrentStopwatch _owner;
    private Stopwatch _ownTime;
    private bool _running;

    public Handle(ConcurrentStopwatch owner)
    {
      _owner = owner;
      _ownTime = new();
    }

    public Handle Start()
    {
      if (_running == (_running = true))
      {
        return this;
      }
      _ownTime.Start();
      _owner.ToggleStopwatch(true);

      return this;
    }

    public Handle Stop()
    {
      if (_running == (_running = false))
      {
        return this;
      }
      _ownTime.Stop();
      _ownTime.Reset();
      _owner.ToggleStopwatch(false);
      Interlocked.Add(ref _owner._totalElapsed, _owner.Elapsed.Ticks);

      return this;
    }

    #region IDisposable Members

    public void Dispose()
    {
      Stop();
    }

    #endregion
  }

  #endregion
}
