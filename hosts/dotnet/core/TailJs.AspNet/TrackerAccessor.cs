namespace TailJs.AspNet;

public class TrackerAccessor : ITrackerAccessor
{
  public ITrackerEnvironment Environment { get; set; }
  public ITracker? Tracker { get; set; }
}
