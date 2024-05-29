// ReSharper disable UnusedMember.Global

using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.ClearScript;
using Microsoft.ClearScript.JavaScript;
using Microsoft.ClearScript.V8;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace TailJs.Scripting;

public class RequestHandler : IRequestHandler
{
  private readonly TrackerConfiguration _configuration;
  private readonly IScriptEngineExtension[] _extensions;

  private readonly SemaphoreSlim _mutex = new(1);

  private readonly ResourceManager _resources;
  private readonly ITrackerExtension[] _trackerExtensions;
  private readonly IScriptLoggerFactory? _loggerFactory;

  private bool _initialized;
  private ScriptObject? _proxy;
  private V8ScriptEngine? _engine;
  private readonly CancellationTokenSource _disposed;

  public RequestHandler(
    IOptions<TrackerConfiguration> configuration,
    ResourceManager resources,
    ITrackerExtension[] trackerExtensions,
    IScriptLoggerFactory? loggerFactory
  )
  {
    _resources = resources;
    _trackerExtensions = trackerExtensions;
    _loggerFactory = loggerFactory;
    _configuration = configuration.Value;
    _extensions = new[] { (IScriptEngineExtension)new Timeouts() };
    _disposed = new CancellationTokenSource();
  }

  internal ScriptObject Proxy =>
    _proxy ?? throw new InvalidOperationException("The proxy has not been initialized.");

  internal Uint8ArrayConverter Uint8ArrayConverter { get; private set; } = null!;

  private async ValueTask CheckInitialized(CancellationToken cancellationToken = default) =>
    await InitializeAsync(cancellationToken).ConfigureAwait(false);

  internal async Task PostEventsAsync(
    ITrackerHandle handle,
    string eventsJson,
    CancellationToken cancellationToken = default
  )
  {
    await CheckInitialized(cancellationToken).ConfigureAwait(false);

    await Proxy
      .InvokeMethod("postEvents", TryGetTrackerHandle(handle, true), eventsJson)
      .AwaitScript(cancellationToken: cancellationToken)
      .ConfigureAwait(false);
  }

  internal string ToJson(IScriptObject value) => (string)Proxy.InvokeMethod("stringify", value);

  internal string[] ToJsonArray(IScriptObject value) => (string[])Proxy.InvokeMethod("stringify", value);

  internal IScriptObject FromJson(string json) => (IScriptObject)Proxy.InvokeMethod("parse", json);

  private static IScriptTrackerHandle? ValidateHandle(ITrackerHandle? handle, bool required) =>
    handle == null
      ? required
        ? throw new ArgumentNullException(nameof(handle), "A valid tracker handle is required.")
        : null
      : handle as IScriptTrackerHandle
        ?? throw new ArgumentException("Unsupported implementation of ITracker.");

  private static IScriptObject? TryGetTrackerHandle(ITrackerHandle? handle, bool required = false) =>
    ValidateHandle(handle, required)?.ScriptHandle;

  private static Tracker? TryGetTracker(ITrackerHandle? handle, bool required = false) =>
    ValidateHandle(handle, required)?.Resolved;

  #region IRequestHandler Members

  public ITrackerEnvironment Environment { get; private set; } = null!;

  public void Dispose()
  {
    if (_disposed.IsCancellationRequested)
    {
      return;
    }

    _disposed.Cancel();

    foreach (var extension in _extensions)
    {
      extension.Dispose();
    }

    _engine?.Dispose();
    _disposed.Dispose();
  }

  public IReadOnlyList<ClientResponseCookie> GetClientCookies(ITrackerHandle? handle) =>
    TryGetTracker(handle) is { } tracker
      ? CookieCollection.MapCookies(
        tracker.RequestHandler.Proxy.InvokeMethod("getClientCookies", tracker.ScriptHandle)
      )
      : Array.Empty<ClientResponseCookie>();

  public async ValueTask<string?> GetClientScriptsAsync(
    ITrackerHandle? tracker,
    object? initialCommands = null,
    string? nonce = null,
    CancellationToken cancellationToken = default
  ) =>
    TryGetTrackerHandle(tracker) is { } scriptHandle
      ? (
        await Proxy
          .InvokeMethod(
            "getClientScripts",
            scriptHandle,
            new
            {
              initialCommands = initialCommands is string
                ? initialCommands
                : Environment.HttpEncode(JsonNodeConverter.Serialize(initialCommands)),
              nonce
            }
          )
          .AwaitScript(cancellationToken)
          .ConfigureAwait(false)
      ).Get<string?>()
      : null;

  public async ValueTask InitializeAsync(CancellationToken cancellationToken = default)
  {
    if (!_initialized)
    {
      using var lck = await _mutex.AcquireLockAsync(cancellationToken).ConfigureAwait(false);
      if (!_initialized)
      {
        _loggerFactory?.DefaultLogger.LogInformation("Initializing script host...");
        _engine = new V8ScriptEngine();
        _engine.AccessContext = typeof(RequestHandler);

        _engine.DocumentSettings.AccessFlags = DocumentAccessFlags.EnableFileLoading;
        _engine.DocumentSettings.Loader = new ResourceDocumentLoader(_resources);
        Uint8ArrayConverter = new Uint8ArrayConverter(_engine);

        var host = new ScriptHost(_resources, _loggerFactory, Uint8ArrayConverter, _disposed.Token);
        foreach (var extension in _extensions)
        {
          await extension.SetupAsync(_engine, _resources, cancellationToken).ConfigureAwait(false);
        }

        var hostReference = await host.SetupAsync(_engine, _resources, cancellationToken)
          .ConfigureAwait(false);

        var script = new StringBuilder("import {bootstrap} from 'js/engine.js';")
          .AppendLine(
            string.Join(
              "",
              _configuration.ScriptExtensions.Select(config =>
                $"import {{{config.Import}}} from {JsonSerializer.Serialize(config.Module ?? "js/engine.js")};"
              )
            )
          )
          .AppendLine(
            "async (host, endpoint, encryptionKeys, secure, debugScript, clientKeySeed, extensions) => {"
          )
          .Append(
            "const handler = bootstrap({host,endpoint,cookies: {secure}, debugScript, clientKeySeed, encryptionKeys: JSON.parse(encryptionKeys), extensions: ["
          )
          .AppendLine(
            string.Join(
              ",",
              _configuration.ScriptExtensions.Select(config =>
                $"new {config.Import}({(config.Settings == null ? "" : JsonSerializer.Serialize<IConfiguration>(config.Settings, new JsonSerializerOptions
                {
                  Converters = { ConfigurationJsonConverter.Instance },
                  PropertyNamingPolicy = JsonNamingPolicy.CamelCase }))})"
              )
            )
          )
          .AppendLine(",...extensions]});")
          .AppendLine("await handler.initialize();return handler;}")
          .ToString();
        var bootstrap = (ScriptObject)
          _engine.Evaluate(new DocumentInfo() { Category = ModuleCategory.Standard }, script);

        var requestHandler = (IScriptObject)
          await bootstrap
            .Invoke(
              false,
              hostReference,
              _configuration.Endpoint,
              JsonNodeConverter.Serialize(_configuration.CookieKeys),
              _configuration.Secure,
              _configuration.ClientScript ?? (object)_configuration.Debug,
              _configuration.ClientKeySeed,
              _trackerExtensions
            )
            .AwaitScript(cancellationToken: cancellationToken)
            .ConfigureAwait(false)!;

        requestHandler.Attach(this);

        _proxy = (ScriptObject)
          (
            (ScriptObject)
              _engine.Evaluate(
                await _resources
                  .ReadTextAsync("js/request-handler.js", null, cancellationToken)
                  .ConfigureAwait(false)
              )
          ).Invoke(false, requestHandler, this);

        var environmentHandle = (IScriptObject)requestHandler["environment"];
        Environment = new TrackerEnvironment(
          (ScriptObject)(
            (
              (ScriptObject)(
                _engine!.Evaluate(
                  await _resources
                    .ReadTextAsync("js/environment.js", null, cancellationToken)
                    .ConfigureAwait(false)
                )
              )
            ).Invoke(false, environmentHandle)
          ),
          _resources,
          Uint8ArrayConverter,
          environmentHandle
        );

        _initialized = true;
        _loggerFactory?.DefaultLogger.LogInformation("The script host was successfully initialized.");
      }
    }
  }

  Task IRequestHandler.PostEventsAsync(
    ITrackerHandle tracker,
    string eventsJson,
    CancellationToken cancellationToken
  ) => PostEventsAsync(tracker, eventsJson, cancellationToken);

  public async ValueTask<TrackerContext?> ProcessRequestAsync(
    ClientRequest clientRequest,
    CancellationToken cancellationToken = default
  )
  {
    var initialized = _initialized;
    await CheckInitialized(cancellationToken); //;.ConfigureAwait(false);

    if (
      await Proxy
        .InvokeMethod("processRequest", clientRequest.Attach(Uint8ArrayConverter))
        .AwaitScript(cancellationToken)
        .ConfigureAwait(false)
        is not IScriptObject proxyResponse
      || proxyResponse["tracker"] is not IScriptObject tracker
    )
    {
      return null;
    }

    return new TrackerContext(
      new ScriptTrackerHandle(tracker),
      proxyResponse["response"] is IScriptObject response
        ? new ClientResponse(
          (int)response["status"],
          response["body"] switch
          {
            string s => Encoding.UTF8.GetBytes(s),
            ITypedArray<byte> bytes => bytes.GetBytes(),
            Undefined => null,
            _ => throw new InvalidOperationException("Unexpected content.")
          },
          response["headers"].Enumerate().ToDictionary(kv => kv.Key, kv => (string)kv.Value!),
          CookieCollection.MapCookies(response["cookies"]),
          response["cacheKey"] as string,
          response["error"] as string
        )
        : null,
      !initialized
    );
  }

  #endregion


  #region Nested type: ResourceDocumentLoader

  private class ResourceDocumentLoader : DefaultDocumentLoader
  {
    private readonly ResourceManager _resources;

    public ResourceDocumentLoader(ResourceManager resources)
    {
      _resources = resources;
    }

    public override async Task<Document> LoadDocumentAsync(
      DocumentSettings settings,
      DocumentInfo? sourceInfo,
      string specifier,
      DocumentCategory category,
      DocumentContextCallback contextCallback
    )
    {
      specifier = Regex.Replace(specifier, @"^@tailjs\/(?<Package>.*)", "js/${Package}.js");

      if (specifier.StartsWith("js/"))
      {
        sourceInfo ??= new DocumentInfo(specifier);
        return new StringDocument(
          new DocumentInfo(specifier) { Category = sourceInfo.Value.Category ?? DocumentCategory.Script, },
          await _resources.ReadTextAsync(specifier).ConfigureAwait(false)
        );
      }

      return await base.LoadDocumentAsync(settings, sourceInfo, specifier, category, contextCallback)
        .ConfigureAwait(false);
    }
  }

  #endregion
}
