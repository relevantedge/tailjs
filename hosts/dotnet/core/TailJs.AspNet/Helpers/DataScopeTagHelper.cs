using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Razor.TagHelpers;

using TailJs.Model;

namespace TailJs.AspNet.Helpers;

public abstract class DataScopeTagHelper : TagHelper
{
  private readonly ITrackerRenderingContext? _context;

  protected DataScopeTagHelper(ITrackerRenderingContext? context = null)
  {
    _context = context;
  }

  public override int Order => 1000;

  //protected virtual ElementBoundaryMapping

  protected virtual ElementBoundaryMapping? GetMapping() => null;

  private bool RequireNull(params object?[] values) => values.All(value => value == null);

  private ExternalReference? MapDataSource(ExternalReference? dataSource, string? dataSourceId) =>
    dataSource != null && dataSourceId != null
      ? throw new InvalidOperationException(
        "dataSource and dataSourceId cannot be specified at the same time."
      )
      : dataSource ?? (dataSourceId != null ? new ExternalReference(Id: dataSourceId) : null);

  protected ElementBoundaryMapping? MapComponentData(
    object? data,
    string? id,
    string? name,
    string? typeName,
    string? language,
    ExternalReference? dataSource,
    string? dataSourceId,
    bool? promote
  ) =>
    _context == null
      ? null
      : data != null
        ? (
          RequireNull(id, name, typeName, dataSource)
            ? _context.ItemData.MapModels(null, data, null) is { Component: { } mappedComponent } mapped
              ? mapped with
              {
                Component = mappedComponent with
                {
                  Language = language ?? mappedComponent.Language,
                  DataSource = MapDataSource(dataSource, dataSourceId) ?? mappedComponent.DataSource
                }
              }
              : null
            : throw new InvalidOperationException(
              "When data is specified, only language and dataSource are allowed as additional attributes"
            )
        )
        : id == null
          ? RequireNull(name, typeName, language, dataSource)
            ? null
            : throw new InvalidOperationException(
              "Id must be specified if any other attribute has a value apart from the data attribute."
            )
          : new ElementBoundaryMapping(
            Component: new ConfiguredComponent(
              Id: id,
              Name: name,
              TypeName: typeName,
              Language: language,
              DataSource: MapDataSource(dataSource, dataSourceId)
            )
          );

  protected ElementBoundaryMapping? MapContentData(
    object? data,
    string? id,
    string? name,
    string? type,
    string? version,
    string? language,
    string? source
  ) =>
    _context == null
      ? null
      : data != null
        ? (
          RequireNull(id, name, type, version, language, source)
            ? _context.ItemData.MapModels(data, null, null) is { Content: { } mappedContent } mapped
              ? mapped with
              {
                Content = mappedContent with
                {
                  Version = version ?? mappedContent.Version,
                  Language = language ?? mappedContent.Language,
                  Source = source ?? mappedContent.Source
                }
              }
              : null
            : throw new InvalidOperationException(
              "When data is specified, language is the only other allowed attribute."
            )
        )
        : id != null
          ? RequireNull(name, type, version, language, source)
            ? new(
              Content: new Content(Id: id, Name: name, ItemType: type, Version: version, Language: language)
            )
            : throw new InvalidOperationException(
              "Id must be specified if any other attribute has a value apart from the data attribute."
            )
          : null;

  public override void Process(TagHelperContext context, TagHelperOutput output)
  {
    var header = _context?.GetDataScopeHeader(GetMapping());

    if (header != null)
    {
      var preElementHtml = new HtmlContentBuilder().AppendHtml(header.HeaderHtml);
      output.PreElement.MoveTo(preElementHtml);
      preElementHtml.MoveTo(output.PreElement);

      output.PostElement.AppendHtml(header.FooterHtml);
    }
  }
}
