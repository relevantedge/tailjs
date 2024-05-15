namespace TailJs;

public interface IRequestHandler : IDisposable
{
  ITrackerEnvironment? Environment { get; }

  ValueTask InitializeAsync(CancellationToken cancellationToken = default);

  Task PostEventsAsync(ITracker tracker, string eventsJson, CancellationToken cancellationToken = default);

  IReadOnlyList<ClientResponseCookie> GetClientCookies(ITracker tracker);

  ValueTask<string?> GetClientScriptsAsync(
    ITracker tracker,
    string? nonce = null,
    CancellationToken cancellationToken = default
  );

  ValueTask<TrackerContext?> ProcessRequestAsync(
    ClientRequest clientRequest,
    CancellationToken cancellationToken = default
  );
}
