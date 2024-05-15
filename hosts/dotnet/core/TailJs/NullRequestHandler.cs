namespace TailJs;

public class NullRequestHandler : IRequestHandler
{
  #region IRequestHandler Members

  public void Dispose() { }

  public IReadOnlyList<ClientResponseCookie> GetClientCookies(ITracker tracker) =>
    Array.Empty<ClientResponseCookie>();

  public ValueTask<string?> GetClientScriptsAsync(
    ITracker tracker,
    string? nonce = null,
    CancellationToken cancellationToken = default
  ) => default;

  public ITrackerEnvironment? Environment => null;

  public ValueTask InitializeAsync(CancellationToken cancellationToken = default) => default;

  public Task PostEventsAsync(
    ITracker tracker,
    string eventsJson,
    CancellationToken cancellationToken = default
  ) => Task.CompletedTask;

  public ValueTask<TrackerContext?> ProcessRequestAsync(
    ClientRequest clientRequest,
    CancellationToken cancellationToken = default
  ) => default;

  #endregion
}
