using System.Diagnostics.CodeAnalysis;
using Microsoft.ClearScript;
using TailJs.Variables;

namespace TailJs.Scripting;

[SuppressMessage("ReSharper", "InconsistentNaming")]
internal class VariableStorageProxy : IVariableStorage
{
  private readonly IVariableStorage _storage;
  private readonly JsonNodeConverter _json;

  public VariableStorageProxy(IVariableStorage storage, JsonNodeConverter _json)
  {
    _storage = storage;
    this._json = _json;
  }

  internal object initialize(IScriptObject environment) =>
    InitializeAsync(environment.RequireAttachment<TrackerEnvironment>()).AsPromiseLike();

  internal object get(IScriptObject scriptGetters, object? context = null)
  {
    var getters = scriptGetters
      .EnumerateScriptValues(item => _json.ParseVariableGetter(item))
      .Where(getter => getter != null)
      .ToList();

    return Inner().AsPromiseLike()!;

    async ValueTask<object> Inner()
    {
      return (await GetAsync(getters!)).Select(result => _json.ToScriptValue(result));
    }
  }

  internal object head(IScriptObject scriptFilters, object? options = null, object? context = null)
  {
    return Inner().AsPromiseLike()!;

    async ValueTask<object?> Inner()
    {
      return _json.ToScriptValue(
        await HeadAsync(
          scriptFilters.EnumerateScriptValues(item => _json.ParseVariableFilter(item)!).ToList(),
          _json.ParseQueryOptions(_json.ParseQueryOptions(options))
        )
      );
    }
  }

  internal object query(IScriptObject scriptFilters, object? options = null, object? context = null)
  {
    return Inner().AsPromiseLike()!;

    async ValueTask<object?> Inner()
    {
      return _json.ToScriptValue(
        await QueryAsync(
          scriptFilters.EnumerateScriptValues(item => _json.ParseVariableFilter(item)!).ToList(),
          _json.ParseQueryOptions(_json.ParseQueryOptions(options))
        )
      );
    }
  }

  internal object set(IScriptObject scriptGetters, object? context = null)
  {
    var setters = scriptGetters
      .EnumerateScriptValues(item => _json.ParseVariableSetter(item))
      .Where(getter => getter != null)
      .ToList();

    return Inner().AsPromiseLike()!;

    async ValueTask<object> Inner()
    {
      return (await SetAsync(setters)).Select(result => _json.ToScriptValue(result));
    }
  }

  internal object renew(object scope, object targetIds, object? context = null)
  {
    return Inner().AsPromiseLike();

    async ValueTask Inner()
    {
      await RenewAsync((VariableScope)scope.RequireScriptInteger(), targetIds.GetScriptArray<string>()!);
    }
  }

  internal object purge(object filters, object? context = null)
  {
    return Inner().AsPromiseLike();

    async ValueTask Inner()
    {
      await PurgeAsync(filters.EnumerateScriptValues(filter => _json.ParseVariableFilter(filter)!).ToList());
    }
  }

  #region IVariableStorage Members

  public ValueTask<IReadOnlyList<IVariableGetResult?>> GetAsync(
    IReadOnlyList<IVariableGetter?> getters,
    CancellationToken cancellationToken = default
  ) => _storage.GetAsync(getters, cancellationToken);

  public ValueTask<VariableHeadResults> HeadAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  ) => _storage.HeadAsync(filters, options, cancellationToken);

  public ValueTask InitializeAsync(
    ITrackerEnvironment environment,
    CancellationToken cancellationToken = default
  ) => _storage.InitializeAsync(environment, cancellationToken);

  public ValueTask<bool> PurgeAsync(
    IReadOnlyList<VariableFilter> filters,
    CancellationToken cancellationToken = default
  ) => _storage.PurgeAsync(filters, cancellationToken);

  public ValueTask<VariableHeadResults> QueryAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  ) => _storage.QueryAsync(filters, options, cancellationToken);

  public ValueTask RenewAsync(
    VariableScope scope,
    IReadOnlyList<string> targetIds,
    CancellationToken cancellationToken = default
  ) => _storage.RenewAsync(scope, targetIds, cancellationToken);

  public ValueTask<IReadOnlyList<IVariableSetResult?>> SetAsync(
    IReadOnlyList<IVariableSetter?> setters,
    CancellationToken cancellationToken = default
  ) => _storage.SetAsync(setters, cancellationToken);

  #endregion
}
