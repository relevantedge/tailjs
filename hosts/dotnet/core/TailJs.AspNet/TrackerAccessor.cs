namespace TailJs.AspNet;

public class TrackerAccessor : ITrackerAccessor
{
  private ITracker? _resolvedTracker;

  internal Func<ValueTask<ITracker>>? Resolver { get; set; }

  public async ValueTask<ITracker?> ResolveTracker(CancellationToken cancellationToken = default) =>
    _resolvedTracker ??= Resolver != null ? await Resolver() : null;
}
