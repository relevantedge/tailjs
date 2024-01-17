namespace TailJs;

public interface ITracker
{
  ICookieCollection Cookies { get; }

  ITrackerVariableCollection Variables { get; }

  string Url { get; }
  
  ITrackerEnvironment Environment { get; }

  Task<TrackerHttpResponse> ForwardRequestAsync(
    TrackerHttpRequest request,
    CancellationToken cancellationToken = default
  );

  Task PostEventsAsync(IEnumerable<string> jsonEvents, CancellationToken cancellationToken = default);
}
