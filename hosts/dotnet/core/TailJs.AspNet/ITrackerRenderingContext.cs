namespace TailJs.AspNet;

public interface ITrackerRenderingContext : ITrackerAccessor
{
  TextWriter? CurrentViewWriter { get; }

  IModelContext ItemData { get; }

  IDataMarkupHeader? GetDataScopeHeader(ElementBoundaryMapping? mapping);

  ValueTask<string> GetClientScriptAsync(IEnumerable<string>? references);
}

public class NullTrackerRenderingContext : ITrackerRenderingContext
{
  #region ITrackerRenderingContext Members

  public TextWriter? CurrentViewWriter => null;

  public IModelContext ItemData { get; } = new NullModelContext();

  public ValueTask<string> GetClientScriptAsync(IEnumerable<string>? references) => default;

  public IDataMarkupHeader? GetDataScopeHeader(ElementBoundaryMapping? mapping) => null;

  public ValueTask<ITracker?> ResolveTracker(CancellationToken cancellationToken = default) => default;

  #endregion
}
