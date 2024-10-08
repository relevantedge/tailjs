﻿using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
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

  #region ITrackerRenderingContext Members

  public TextWriter? CurrentViewWriter => _viewWriterAccessor.CurrentWriter;

  public IModelContext ItemData { get; }

  public async ValueTask<string> GetClientScriptAsync(IEnumerable<string>? references) =>
    await _requestHandler.GetClientScriptsAsync(
      _trackerAccessor.TrackerHandle,
      new object[]
      {
        new
        {
          scan = new
          {
            attribute = _configuration.AttributeName,
            components = references?.Select(reference => JsonNode.Parse(reference))
              ?? Enumerable.Empty<JsonNode>()
          },
        },
        new
        {
          set = new object[]
          {
            new
            {
              scope = "view",
              key = "view",
              value = ItemData.CurrentContextItem
            },
            new
            {
              scope = "view",
              key = "rendered",
              value = true
            }
          }
        }
      },
      _nonceProvider?.GetNonce()
    ) ?? "";

  public IDataMarkupHeader? GetDataScopeHeader(ElementBoundaryMapping? mapping) =>
    !mapping.IsEmpty()
      ? new DataMarkupHeader(_writer.GetScopeDataHeader(mapping), _writer.GetScopeDataFooter())
      : null;

  public async ValueTask<ITracker?> TryResolveTrackerAsync(CancellationToken cancellationToken = default) =>
    ItemData.EnvironmentType == EnvironmentType.Public
      ? await _trackerAccessor.ResolveTracker(cancellationToken)
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


  // JsonSerializer.Serialize(
  //   _environment.HttpEncode(JsonSerializer.Serialize(value, _writer.JsonSerializerOptions))
  // );
}
