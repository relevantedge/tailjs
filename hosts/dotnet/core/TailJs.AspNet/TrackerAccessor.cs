namespace TailJs.AspNet;

public class TrackerAccessor : ITrackerAccessor
{
  private ITracker? _resolvedTracker;

  public ITrackerHandle? TrackerHandle { get; internal set; }

  public async ValueTask<ITracker?> ResolveTracker(CancellationToken cancellationToken = default) =>
    _resolvedTracker ??=
      TrackerHandle != null
        ? await TrackerHandle.ResolveAsync(cancellationToken).ConfigureAwait(false)
        : null;
}
