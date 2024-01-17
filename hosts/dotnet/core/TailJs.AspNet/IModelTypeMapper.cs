namespace TailJs.AspNet;

public interface IModelTypeMapper
{
  public int Priority { get; }

  bool Match(Type modelType);

  ElementBoundaryMapping? MapModel(object? model, MappingContext context, Func<ElementBoundaryMapping> next);
}

public class ModelTypeMapper<T> : IModelTypeMapper
{
  private readonly Func<T, MappingContext, Func<ElementBoundaryMapping>, ElementBoundaryMapping?> _mapper;

  public ModelTypeMapper(
    Func<T, MappingContext, Func<ElementBoundaryMapping?>, ElementBoundaryMapping?> mapper,
    int priority = 0
  )
  {
    _mapper = mapper;
    Priority = priority;
  }

  #region IModelTypeMapper Members

  public int Priority { get; }

  public ElementBoundaryMapping? MapModel(
    object? model,
    MappingContext context,
    Func<ElementBoundaryMapping> next
  ) => model is T typedModel ? _mapper(typedModel, context, next) : null;

  public bool Match(Type modelType) => typeof(T).IsAssignableFrom(modelType);

  #endregion
}
