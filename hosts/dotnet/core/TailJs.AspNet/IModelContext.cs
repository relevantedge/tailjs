using System.Diagnostics.CodeAnalysis;

using Microsoft.AspNetCore.Mvc.Razor;

using TailJs.Model;

namespace TailJs.AspNet;

public interface IContextItemResolver
{
  public int Priority => 0;

  public Content? CurrentContextItem { get; }

  public EnvironmentType? EnvironmentType { get; }
}

public interface IModelContext
{
  public Content? CurrentContextItem { get; }

  public EnvironmentType EnvironmentType { get; }

  public ElementBoundaryMapping? MapModel(object? model, MappingContext context);

  public ElementBoundaryMapping? MapModels(
    object? contentModel,
    object? componentModel,
    ElementBoundaryMapping? current
  );

  public ElementBoundaryMapping? MapView(MappedView view);
}

public static class ModelContextExtensions
{
  [return: NotNullIfNotNull("mapping")]
  public static ElementBoundaryMapping? WithTrackerSettings(
    this ElementBoundaryMapping? mapping,
    TrackingSettings settings
  ) =>
    mapping?.Component.WithTrackerSettings(settings) is { } component && component != mapping.Component
      ? mapping with
      {
        Component = component
      }
      : mapping;

  [return: NotNullIfNotNull("component")]
  public static ConfiguredComponent? WithTrackerSettings(
    this ConfiguredComponent? component,
    TrackingSettings settings
  ) =>
    component != null && component.Track != settings
      ? component with
      {
        Track = component.Track.Merge(settings)
      }
      : component;

  public static ElementBoundaryMapping MapComponent(
    this IModelContext context,
    object? model,
    MappingContext currentContext
  ) =>
    context.MapModel(model, new ComponentMappingContext(currentContext.Current, currentContext.Mapper))
    ?? new();

  public static ElementBoundaryMapping MapContent(
    this IModelContext context,
    object? model,
    MappingContext currentContext
  ) =>
    context.MapModel(model, new ContentMappingContext(currentContext.Current, currentContext.Mapper))
    ?? new();
}
