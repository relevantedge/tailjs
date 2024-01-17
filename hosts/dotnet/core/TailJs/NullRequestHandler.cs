namespace TailJs;

public class NullRequestHandler : IRequestHandler
{
  #region IRequestHandler Members

  public void Dispose() { }

  public IReadOnlyList<ClientResponseCookie> GetClientCookies(ITracker tracker) =>
    Array.Empty<ClientResponseCookie>();

  public string? GetClientScripts(ITracker tracker, string? nonce = null) => null;

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
