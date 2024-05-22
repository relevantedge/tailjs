using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace TailJs.Scripting;

public partial class RequestHandlerPool : IRequestHandlerPool
{
  private readonly IOptionsMonitor<TrackerConfiguration> _configuration;
  private readonly Services? _services;
  private readonly IScriptLoggerFactory? _loggerFactory;
  private PooledRequestHandler[]? _requestHandlers;

  private long _nextHandler;
  private readonly Debounce _recycler;
  private readonly ResourceManager _resources;
  private readonly IDisposable? _configurationChangeMonitor;

  public RequestHandlerPool(
    IOptionsMonitor<TrackerConfiguration> configuration,
    Services? services = null,
    IScriptLoggerFactory? loggerFactory = null
  )
  {
    _configuration = configuration;

    _services = services;
    _loggerFactory = loggerFactory;
    var providers = new List<IFileProvider>();
    if (_configuration.CurrentValue.ScriptDirectory is { } scriptDirectory)
    {
      if (services == null)
      {
        scriptDirectory = Path.GetFullPath(scriptDirectory);
      }

      providers.Add(
        new RewriteFileProvider(
          path => path.StartsWith("js/") ? path.Substring(3) : null,
          Path.IsPathRooted(scriptDirectory)
            ? new PhysicalFileProvider(scriptDirectory)
            : RewriteFileProvider.FromPrefix(scriptDirectory, services!.DefaultProvider)
        )
      );
    }

    if (_configuration.CurrentValue.ResourcePath == null && services?.DefaultProvider != null)
    {
      _configuration.CurrentValue.ResourcePath = "";
    }

    if (_configuration.CurrentValue.ResourcePath is { } resourcePath)
    {
      if (services == null)
      {
        resourcePath = Path.GetFullPath(resourcePath);
      }

      if (File.Exists(resourcePath) || services != null)
      {
        providers.Add(
          MutableFileProvider.AsMutable(
            Path.IsPathRooted(resourcePath)
              ? new PhysicalFileProvider(resourcePath)
              : RewriteFileProvider.FromPrefix(resourcePath, services!.DefaultProvider)
          )
        );
      }
    }

    providers.Add(new EmbeddedFileProvider(typeof(RequestHandler).Assembly));

    _recycler = new Debounce(
      _ =>
      {
        ResetHandlers();
        return new();
      },
      TimeSpan.FromMilliseconds(500)
    );

    _configurationChangeMonitor = _configuration.OnChange(
      (_, name) =>
      {
        // Only watch default named option (CurrentValue)
        if (name != Options.DefaultName)
        {
          return;
        }

        _loggerFactory?.DefaultLogger.LogInformation("Tracker configuration has changed. Recycling host...");
        ResetHandlers();
      }
    );

    _resources = new ResourceManager(
      providers,
      async (path) =>
      {
        if (path.StartsWith("js/"))
        {
          _loggerFactory?.DefaultLogger.LogInformation($"The file '{path}' was changed. Recycling host...");
          // Wait a little bit in case other files are also changing
          await Recycle().ConfigureAwait(false);

          return false;
        }

        return true;
      }
    );

    ResetHandlers();
    _loggerFactory?.DefaultLogger.LogInformation(
      $"tailjs request handler pool initialized with max concurrency {configuration.CurrentValue.InstanceCount}."
    );
  }

  private void ResetHandlers()
  {
    var previous = _requestHandlers;
    _requestHandlers = Enumerable
      .Range(0, _configuration.CurrentValue.InstanceCount)
      .Select(_ => new PooledRequestHandler(
        new RequestHandler(
          Options.Create(_configuration.CurrentValue),
          _resources,
          _services?.Extensions ?? Array.Empty<ITrackerExtension>(),
          _loggerFactory
        )
      ))
      .ToArray();

    if (previous != null)
    {
      foreach (var handler in previous)
      {
        handler.End();
      }
    }
  }

  #region IRequestHandlerPool Members

  private bool _disposed;

  public void Dispose()
  {
    if (_disposed == (_disposed = true))
    {
      return;
    }

    _recycler.Dispose();
    _configurationChangeMonitor?.Dispose();

    if (_requestHandlers != null)
    {
      foreach (var handler in _requestHandlers)
      {
        handler.End();
      }
    }
  }

  public IRequestHandler GetRequestHandler() =>
    _requestHandlers![Interlocked.Increment(ref _nextHandler) % _requestHandlers.Length].Increment();

  public ValueTask Recycle(CancellationToken cancellationToken = default) =>
    _recycler.Invoke(cancellationToken);

  #endregion


  #region Nested type: Services

  public class Services
  {
    public Services(IFileProvider defaultProvider, IReadOnlyCollection<ITrackerExtension>? extensions)
    {
      DefaultProvider = defaultProvider;
      Extensions = extensions?.ToArray() ?? Array.Empty<ITrackerExtension>();
    }

    public IFileProvider DefaultProvider { get; }

    public ITrackerExtension[] Extensions { get; }
  }

  #endregion
}
