namespace TailJs;

public interface IRequestHandler : IDisposable
{
  ITrackerEnvironment? Environment { get; }

  ValueTask InitializeAsync(CancellationToken cancellationToken = default);

  Task PostEventsAsync(ITracker tracker, string eventsJson, CancellationToken cancellationToken = default);

  IReadOnlyList<ClientResponseCookie> GetClientCookies(ITracker tracker);

  string? GetClientScripts(ITracker tracker, string? nonce = null);

  ValueTask<TrackerContext?> ProcessRequestAsync(
    ClientRequest clientRequest,
    CancellationToken cancellationToken = default
  );
}
