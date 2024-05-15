namespace TailJs.Scripting;

public partial class RequestHandlerPool
{
  #region Nested type: PooledRequestHandler

  private sealed class PooledRequestHandler : IRequestHandler
  {
    private long _activeRequests;
    private volatile bool _disposing;
    private readonly IRequestHandler _inner;

    public PooledRequestHandler(IRequestHandler inner)
    {
      _inner = inner;
    }

    public IRequestHandler Increment()
    {
      Interlocked.Increment(ref _activeRequests);
      return this;
    }

    public void End()
    {
      _disposing = true;
      if (Interlocked.Read(ref _activeRequests) == 0)
      {
        DisposeInternal();
      }
    }

    private void DisposeInternal() => _inner.Dispose();

    #region IRequestHandler Members

    public ITrackerEnvironment? Environment => _inner.Environment;

    public void Dispose()
    {
      if (Interlocked.Decrement(ref _activeRequests) <= 0 && _disposing)
      {
        DisposeInternal();
      }
    }

    public IReadOnlyList<ClientResponseCookie> GetClientCookies(ITracker tracker) =>
      _inner.GetClientCookies(tracker);

    public ValueTask<string?> GetClientScriptsAsync(
      ITracker tracker,
      string? nonce,
      CancellationToken cancellationToken = default
    ) => _inner.GetClientScriptsAsync(tracker, nonce, cancellationToken);

    public ValueTask InitializeAsync(CancellationToken cancellationToken = default) =>
      _inner.InitializeAsync(cancellationToken);

    public Task PostEventsAsync(
      ITracker tracker,
      string eventsJson,
      CancellationToken cancellationToken = default
    ) => _inner.PostEventsAsync(tracker, eventsJson, cancellationToken);

    public ValueTask<TrackerContext?> ProcessRequestAsync(
      ClientRequest clientRequest,
      CancellationToken cancellationToken = default
    ) => _inner.ProcessRequestAsync(clientRequest, cancellationToken);

    #endregion
  }

  #endregion
}
