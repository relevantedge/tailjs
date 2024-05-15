using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using TailJs.IO;

namespace TailJs.AspNet;

public class TrackerRenderingContext : ITrackerRenderingContext
{
  private readonly DataMarkupWriter _writer;
  private readonly IRequestHandler _requestHandler;
  private readonly ITrackerAccessor _trackerAccessor;
  private readonly IViewWriterAccessor _viewWriterAccessor;
  private readonly ITrackerEnvironment _environment;
  private readonly IScriptNonceProvider? _nonceProvider;
  private readonly ObjectPool<StringBuilder> _writers;
  private readonly TrackerConfiguration _configuration;

  private ITracker? _mappedTracker;

  public TrackerRenderingContext(
    IOptions<TrackerConfiguration> configuration,
    ObjectLease<DataMarkupWriter> writerLease,
    IRequestHandler requestHandler,
    ITrackerAccessor trackerAccessor,
    ITrackerEnvironment environment,
    IViewWriterAccessor viewWriterAccessor,
    IModelContext itemDataMapper,
    IScriptNonceProvider? nonceProvider = null
  )
  {
    _writer = writerLease.Item;

    _requestHandler = requestHandler;
    _trackerAccessor = trackerAccessor;
    _viewWriterAccessor = viewWriterAccessor;
    _environment = environment;
    _nonceProvider = nonceProvider;
    _configuration = configuration.Value;
    _writers = new ObjectPool<StringBuilder>(
      _ => new StringBuilder(),
      sb => sb.Clear(),
      null,
      _configuration.WriterPoolSize
    );
    ItemData = itemDataMapper;
  }

  private string ToScript<T>(T value) =>
    _configuration.UseJson
      ? JsonSerializer.Serialize(value, _writer.JsonSerializerOptions)
      : JsonSerializer.Serialize(
        _environment.HttpEncode(JsonSerializer.Serialize(value, _writer.JsonSerializerOptions))
      );

  // JsonSerializer.Serialize(
  //   _environment.HttpEncode(JsonSerializer.Serialize(value, _writer.JsonSerializerOptions))
  // );

  #region ITrackerRenderingContext Members

  public TextWriter? CurrentViewWriter => _viewWriterAccessor.CurrentWriter;

  public IModelContext ItemData { get; }

  public ITracker? Tracker =>
    ItemData.EnvironmentType == EnvironmentType.Public ? (_mappedTracker ??= _trackerAccessor.Tracker) : null;

  public async ValueTask<string> GetClientScriptAsync(IEnumerable<string>? references)
  {
    using var script = _writers.Rent();
    var writer = script.Item;
    var nonce = _nonceProvider?.GetNonce();
    writer.Append("<script");

    if (nonce != null)
    {
      writer.Append(" nonce=").Append(nonce);
    }

    writer
      .Append(">(")
      .Append(_configuration.TrackerName)
      .Append("=(window.")
      .Append(_configuration.TrackerName)
      .Append("??=[]))")
      .Append(".push(")
      .Append(
        ToScript(
          new
          {
            scan = new
            {
              attribute = _configuration.AttributeName,
              components = references?.Select(reference => JsonNode.Parse(reference))
                ?? Enumerable.Empty<JsonNode>()
            }
          }
        )
      )
      .Append(",")
      .Append(
        ToScript(
          new
          {
            set = new[]
            {
              new
              {
                scope = "view",
                key = "view",
                value = ItemData.CurrentContextItem
              },
              // TODO: Create variable getter and setter interfaces.
              // new
              // {
              //   scope = "view",
              //   key = "rendered",
              //   value = true
              // }
            }
          }
        )
      )
      .Append(");")
      .Append("</script>");
    if (Tracker != null && (await _requestHandler.GetClientScriptsAsync(Tracker, nonce)) is { } trackerScript)
    {
      writer.Append(trackerScript);
    }

    return writer.ToString();
  }

  public IDataMarkupHeader? GetDataScopeHeader(ElementBoundaryMapping? mapping) =>
    !mapping.IsEmpty()
      ? new DataMarkupHeader(_writer.GetScopeDataHeader(mapping), _writer.GetScopeDataFooter())
      : null;

  #endregion


  #region Nested type: DataMarkupHeader

  private class DataMarkupHeader : IDataMarkupHeader
  {
    public DataMarkupHeader(string header, string footer)
    {
      HeaderHtml = header;
      FooterHtml = footer;
    }

    #region IDataMarkupHeader Members

    public string FooterHtml { get; }

    public string HeaderHtml { get; }

    #endregion
  }

  #endregion
}
