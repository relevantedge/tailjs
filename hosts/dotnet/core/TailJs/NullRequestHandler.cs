namespace TailJs;

public class NullRequestHandler : IRequestHandler
{
  #region IRequestHandler Members

  public void Dispose() { }

  public IReadOnlyList<ClientResponseCookie> GetClientCookies(ITrackerHandle? tracker) =>
    Array.Empty<ClientResponseCookie>();

  public ValueTask<string?> GetClientScriptsAsync(
    ITrackerHandle? tracker,
    object? initialCommands = null,
    string? nonce = null,
    CancellationToken cancellationToken = default
  ) => default;

  public ITrackerEnvironment? Environment => null;

  public ValueTask InitializeAsync(CancellationToken cancellationToken = default) => default;

  public Task PostEventsAsync(
    ITrackerHandle tracker,
    string eventsJson,
    CancellationToken cancellationToken = default
  ) => Task.CompletedTask;

  public ValueTask<TrackerContext?> ProcessRequestAsync(
    ClientRequest clientRequest,
    CancellationToken cancellationToken = default
  ) => default;

  #endregion
}
