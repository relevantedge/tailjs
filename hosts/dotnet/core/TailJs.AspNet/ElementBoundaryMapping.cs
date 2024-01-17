using System.Diagnostics.CodeAnalysis;

using TailJs.Model;

namespace TailJs.AspNet;

public record ElementBoundaryMapping(
  Content? Content = null,
  ConfiguredComponent? Component = null,
  string? Area = null,
  IReadOnlyCollection<string>? Tags = null,
  CartEventData? Cart = null,
  TrackingSettings? Track = null
);

public static class ElementBoundaryMappingExtensions
{
  public static TrackingSettings? Merge(this TrackingSettings? settings, TrackingSettings? update) =>
    settings == null
      ? update
      : update == null || settings == update
        ? settings
        : new()
        {
          Promote = update.Promote ?? settings.Promote,
          Clicks = update.Clicks ?? settings.Clicks,
          Impressions = update.Impressions ?? settings.Impressions,
          Region = update.Region ?? settings.Region,
          Secondary = update.Secondary ?? settings.Secondary
        };

  public static bool IsEmpty([NotNullWhen(false)] this ElementBoundaryMapping? mapping) =>
    mapping == null
    || mapping.Content == null
      && mapping.Component == null
      && mapping.Area == null
      && mapping.Tags == null
      && mapping.Cart == null;

  public static ElementBoundaryMapping? IfNotEmpty(this ElementBoundaryMapping? mapping) =>
    !mapping.IsEmpty() ? mapping : null;

  public static ElementBoundaryMapping? Merge(
    this ElementBoundaryMapping? original,
    params ElementBoundaryMapping?[] updates
  )
  {
    var merged = original;
    foreach (var updated in updates)
    {
      if (updated == null)
      {
        continue;
      }

      merged ??= updated;

      merged = new ElementBoundaryMapping(
        Content: updated.Content ?? merged.Content,
        Component: updated.Component ?? merged.Component,
        Area: updated.Area ?? merged.Area,
        Tags: updated.Tags != null && merged.Tags != null
          ? (
            updated.Tags ?? Enumerable.Empty<string>().Concat(merged.Tags ?? Enumerable.Empty<string>())
          ).ToList()
          : updated.Tags ?? merged.Tags,
        Cart: updated.Cart ?? merged.Cart
      );
    }

    return merged;
  }
}
