namespace TailJs;

public interface IRequestHandler : IDisposable
{
  ITrackerEnvironment? Environment { get; }

  ValueTask InitializeAsync(CancellationToken cancellationToken = default);

  Task PostEventsAsync(
    ITrackerHandle tracker,
    string eventsJson,
    CancellationToken cancellationToken = default
  );

  IReadOnlyList<ClientResponseCookie> GetClientCookies(ITrackerHandle? tracker);

  ValueTask<string?> GetClientScriptsAsync(
    ITrackerHandle? tracker,
    string? nonce = null,
    CancellationToken cancellationToken = default
  );

  ValueTask<TrackerContext?> ProcessRequestAsync(
    ClientRequest clientRequest,
    CancellationToken cancellationToken = default
  );
}
