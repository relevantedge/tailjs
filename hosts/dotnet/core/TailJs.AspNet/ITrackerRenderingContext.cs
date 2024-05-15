using TailJs.Model;

namespace TailJs.AspNet;

public interface ITrackerRenderingContext
{
  ITracker? Tracker { get; }

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

  public ITracker? Tracker => null;

  public ValueTask<string> GetClientScriptAsync(IEnumerable<string>? references) => default;

  public IDataMarkupHeader? GetDataScopeHeader(ElementBoundaryMapping? mapping) => null;

  #endregion
}
