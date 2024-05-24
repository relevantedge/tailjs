namespace TailJs;

public interface ITrackerHandle
{
  ValueTask<ITracker> ResolveAsync(CancellationToken cancellationToken = default);
}
