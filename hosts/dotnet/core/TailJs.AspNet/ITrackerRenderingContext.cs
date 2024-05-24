namespace TailJs.AspNet;

public interface ITrackerRenderingContext
{
  TextWriter? CurrentViewWriter { get; }

  IModelContext ItemData { get; }

  IDataMarkupHeader? GetDataScopeHeader(ElementBoundaryMapping? mapping);

  ValueTask<string> GetClientScriptAsync(IEnumerable<string>? references);

  ValueTask<ITracker?> TryResolveTrackerAsync(CancellationToken cancellationToken = default);
}

public class NullTrackerRenderingContext : ITrackerRenderingContext
{
  #region ITrackerRenderingContext Members

  public TextWriter? CurrentViewWriter => null;

  public IModelContext ItemData { get; } = new NullModelContext();

  public ValueTask<string> GetClientScriptAsync(IEnumerable<string>? references) => default;

  public IDataMarkupHeader? GetDataScopeHeader(ElementBoundaryMapping? mapping) => null;

  public ValueTask<ITracker?> TryResolveTrackerAsync(CancellationToken cancellationToken = default) =>
    default;

  #endregion
}
