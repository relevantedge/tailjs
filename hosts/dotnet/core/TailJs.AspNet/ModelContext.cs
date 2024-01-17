using System.Collections.Concurrent;

using Microsoft.AspNetCore.Mvc.Razor;

using TailJs.Model;

namespace TailJs.AspNet;

public class ModelContext : IModelContext
{
  private readonly IContextItemResolver[]? _contextItemResolvers;
  private readonly IModelTypeMapper[]? _typeMappers;

  private readonly ConcurrentDictionary<Type, IModelTypeMapper[]> _mappers = new();

  public ModelContext(
    IEnumerable<IContextItemResolver>? contextItemResolvers = null,
    IEnumerable<IModelTypeMapper>? typeMappers = null
  )
  {
    _contextItemResolvers = contextItemResolvers?.OrderBy(item => item.Priority).ToArray();
    _typeMappers = typeMappers?.OrderBy(item => item.Priority).ToArray();
  }

  public EnvironmentType EnvironmentType =>
    _contextItemResolvers?.Select(resolver => resolver.EnvironmentType).FirstOrDefault(value => value != null)
    ?? EnvironmentType.None;

  private IModelTypeMapper[] GetMappers(Type modelType)
  {
    if (_typeMappers == null)
      return Array.Empty<IModelTypeMapper>();

    if (!_mappers.TryGetValue(modelType, out var mappers))
    {
      lock (this)
      {
        if (!_mappers.TryGetValue(modelType, out mappers))
        {
          _mappers[modelType] = mappers = _typeMappers.Where(mapper => mapper.Match(modelType)).ToArray();
        }
      }
    }

    return mappers;
  }

  public ElementBoundaryMapping? MapModel(object? model, MappingContext context)
  {
    var mappers = GetMappers(model?.GetType() ?? typeof(object));
    var mapperIndex = -1;
    var currentMapperIndex = -1;

    return Next().IfNotEmpty();

    ElementBoundaryMapping Next()
    {
      if (currentMapperIndex++ > mapperIndex)
      {
        throw new InvalidOperationException("Next can only be called once.");
      }

      if (++mapperIndex >= mappers.Length)
      {
        return new();
      }

      var result = mappers[mapperIndex].MapModel(model, context, Next);

      return currentMapperIndex == mapperIndex && result == null ? Next() : (result ?? new());
    }
  }

  #region IModelContext Members

  public Content? CurrentContextItem =>
    _contextItemResolvers?.Select(mapper => mapper.CurrentContextItem).FirstOrDefault(item => item != null);

  public ElementBoundaryMapping? MapModels(
    object? contentModel,
    object? componentModel,
    ElementBoundaryMapping? current
  )
  {
    var boundary =
      contentModel != null ? MapModel(contentModel, new ContentMappingContext(current, this)) : null;
    if (componentModel != null)
    {
      boundary = boundary.Merge(MapModel(componentModel, new ComponentMappingContext(boundary, this)));
    }

    return boundary;
  }

  public ElementBoundaryMapping? MapView(MappedView view) =>
    MapModel(view.Model, new ViewMappingContext(view.View, view.Model, view.Parent, null, this));

  #endregion
}
