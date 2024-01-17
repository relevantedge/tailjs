using TailJs.Model;

namespace TailJs.AspNet;

public class NullModelContext : IModelContext
{
  #region IModelContext Members

  public Content? CurrentContextItem => null;

  public EnvironmentType EnvironmentType => EnvironmentType.None;

  public ElementBoundaryMapping? MapModel(object? model, MappingContext context) => null;

  public ElementBoundaryMapping? MapModels(
    object? contentModel,
    object? componentModel,
    ElementBoundaryMapping? current
  ) => null;

  public ElementBoundaryMapping? MapView(MappedView view) => null;

  #endregion
}
