using System;

namespace TailJs.Model;

public record TrackingSettings(
  bool? Promote = null,
  bool? Secondary = null,
  bool? Region = null,
  bool? Clicks = null,
  bool? Impressions = null
)
{
  /// <summary>
  /// Always include in  <see cref="IUserInteractionEvent.Components"/> , also if it is a parent component. By default only the closest component will be included.
  /// 
  /// This does not apply to impression tracking, and has no effect for  <see cref="Content"/>  since these settings automatically promote containing components.
  /// 
  /// Not inherited by child components.
  /// 
  /// HTML attribute: `track-promote`. CSS: `--track-promote: 1/yes/true`.
  /// 
  /// The default value is false.
  /// </summary>
  public bool? Promote { get; set; } = Promote;
  
  /// <summary>
  /// The component will only be tracked with the closest non-secondary component as if the latter had the  <see cref="Promote"/>  flag.
  /// 
  /// This does not apply to impression tracking and has no effect for  <see cref="Content"/> .
  /// 
  /// Not inherited by child components.
  /// 
  /// HTML attribute: `track-secondary`. \ CSS: `--track-secondary: 1/yes/true`.
  /// 
  /// The default value is false.
  /// </summary>
  public bool? Secondary { get; set; } = Secondary;
  
  /// <summary>
  /// Track the visible region occupied by the component or content.
  /// 
  /// Inherited by child components (also if specified on non-component DOM element).
  /// 
  /// HTML attribute: `track-region`. \ CSS: `--track-region: 1/yes/true`.
  /// 
  /// The default value is false.
  /// </summary>
  public bool? Region { get; set; } = Region;
  
  /// <summary>
  /// Track clicks.
  /// 
  /// Inherited by child components (also if specified on non-component DOM element).
  /// 
  /// HTML attribute: `track-clicks`. CSS: `--track-clicks: 1/yes/true`.
  /// 
  /// The default value is true unless in a `&lt;nav&gt;` tag.
  /// </summary>
  public bool? Clicks { get; set; } = Clicks;
  
  /// <summary>
  /// Track impressions, that is, when the component becomes visible in the user&#39;s browser for the first time. This goes well with  <see cref="Region"/> .
  /// 
  /// Not inherited by child components.
  /// 
  /// HTML attribute: `track-impressions`. CSS: `--track-impressions: 1/yes/true`.
  /// 
  /// The default value is false.
  /// </summary>
  public bool? Impressions { get; set; } = Impressions;
}


