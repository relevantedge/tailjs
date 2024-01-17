using Microsoft.AspNetCore.Razor.TagHelpers;

using TailJs.Model;

namespace TailJs.AspNet.Helpers;

[HtmlTargetElement(Attributes = "track-*")]
public class DataScopeAttributeTagHelper : DataScopeTagHelper
{
  public DataScopeAttributeTagHelper(ITrackerRenderingContext? renderingContext = null)
    : base(renderingContext) { }

  public object? TrackComponent { get; set; }

  public string? TrackComponentId { get; set; }

  public string? TrackComponentName { get; set; }

  public string? TrackComponentTypeName { get; set; }

  public ExternalReference? TrackComponentDataSource { get; set; }

  public string? TrackComponentDataSourceId { get; set; }

  public object? TrackContent { get; set; }

  public string? TrackContentId { get; set; }

  public string? TrackContentName { get; set; }

  public string? TrackContentVersion { get; set; }

  public string? TrackContentSource { get; set; }

  public string? TrackLanguage { get; set; }

  public string? TrackArea { get; set; }

  public string? TrackContentType { get; set; }

  public string? TrackTags { get; set; }

  public bool? TrackImpressions { get; set; }

  public CartEventData? TrackCart { get; set; }

  public string? TrackCartAction { get; set; }

  protected override ElementBoundaryMapping? GetMapping() =>
    (
      MapComponentData(
          TrackComponent,
          TrackComponentId,
          TrackComponentName,
          TrackComponentTypeName,
          TrackLanguage,
          TrackComponentDataSource,
          TrackComponentDataSourceId,
          null
        )
        .Merge(
          MapContentData(
            TrackContent,
            TrackContentId,
            TrackContentName,
            TrackContentType,
            TrackContentVersion,
            TrackLanguage,
            TrackContentSource
          )
        ) ?? new()
    ) with
    {
      Cart = TrackCart ?? (TrackCartAction != null ? new CartEventData(Action: TrackCartAction) : null),
      Area = TrackArea,
      Tags = (TrackTags ?? "")
        .Split(",")
        .Select(value => value.Trim())
        .Where(value => !string.IsNullOrEmpty(value))
        .ToArray(),
      Track = TrackImpressions == true ? new() { Impressions = true } : null
    };
}
