namespace TailJs.AspNet;

public interface ITrackerAccessor
{
  ITrackerEnvironment Environment { get; set; }
  ITracker? Tracker { get; set; }
}
