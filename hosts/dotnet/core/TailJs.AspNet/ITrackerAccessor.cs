namespace TailJs.AspNet;

public interface ITrackerAccessor
{
  ITrackerHandle? TrackerHandle { get; }

  /// <summary>
  /// Resolves the tracker for the current tracker.
  /// </summary>
  /// <param name="cancellationToken"></param>
  /// <returns></returns>
  ValueTask<ITracker?> ResolveTracker(CancellationToken cancellationToken = default);
}
