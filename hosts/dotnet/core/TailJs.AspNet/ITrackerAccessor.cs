namespace TailJs.AspNet;

public interface ITrackerAccessor
{
  ValueTask<ITracker?> ResolveTracker(CancellationToken cancellationToken = default);
}
