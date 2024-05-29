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

  public ValueTask InitializeAsync(
    ITrackerEnvironment environment,
    CancellationToken cancellationToken = default
  ) => _storage.InitializeAsync(environment, cancellationToken);

  internal object initialize(IScriptObject environment) =>
    InitializeAsync(environment.RequireAttachment<TrackerEnvironment>()).AsPromiseLike();

  public ValueTask<IReadOnlyList<IVariableGetResult>> GetAsync(
    IReadOnlyList<IVariableGetter> getters,
    CancellationToken cancellationToken = default
  ) => _storage.GetAsync(getters, cancellationToken);

  internal object get(IScriptObject scriptGetters, object? context = null)
  {
    var getters = scriptGetters
      .Enumerate(item =>
        item is IScriptObject getter
          ? new VariableGetter(
            (VariableScope)getter.Get<int>(),
            getter.Get<string>("key"),
            getter.Get<string?>("targetId"),
            (DataPurposes?)getter.TryGet<int>("purpose"),
            getter.Get<string?>("version"),
            getter.TryGet<bool>("refresh") == true,
            getter.Get("initializer") is IScriptObject initializer
              ? async (cancellationToken) =>
                _json.TryParseVariablePatchResult(
                  await initializer.InvokeAsFunction().AwaitScript(cancellationToken)
                )
              : null
          )
          : null
      )
      .Where(getter => getter != null)
      .ToList();

    var result = _storage.GetAsync(getters!);
  }

  public ValueTask<VariableHeadResults> HeadAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  ) => _storage.HeadAsync(filters, options, cancellationToken);

  public ValueTask<VariableHeadResults> QueryAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  ) => _storage.QueryAsync(filters, options, cancellationToken);

  public ValueTask<IReadOnlyList<IVariableSetResult>> SetAsync(
    IReadOnlyList<IVariableSetter> setters,
    CancellationToken cancellationToken = default
  ) => _storage.SetAsync(setters, cancellationToken);

  public ValueTask RenewAsync(VariableScope scope, IReadOnlyList<string> targetIds) =>
    _storage.RenewAsync(scope, targetIds);

  public ValueTask<bool> PurgeAsync(
    IReadOnlyList<VariableFilter> filters,
    CancellationToken cancellationToken = default
  ) => _storage.PurgeAsync(filters, cancellationToken);
}
