using Microsoft.ClearScript;
using TailJs.Variables;

namespace TailJs.Scripting;

internal class ScriptVariableStorage : IVariableStorage
{
  private readonly IScriptObject _handle;
  private readonly JsonNodeConverter _json;

  public ScriptVariableStorage(IScriptObject handle, JsonNodeConverter json)
  {
    _handle = handle;
    _json = json;
  }

  #region IVariableStorage Members

  public async ValueTask<IReadOnlyList<IVariableGetResult?>> GetAsync(
    IReadOnlyList<IVariableGetter?> getters,
    CancellationToken cancellationToken = default
  )
  {
    var mappedGetters = getters
      .Select(getter =>
        getter == null
          ? (object)Undefined.Value
          : new
          {
            scope = (int)getter.Scope,
            key = getter.Key,
            targetId = getter.TargetId,
            version = getter.Version,
            purpose = (int?)getter.Purpose,
            refresh = getter.Refresh,
            init = getter.Initializer is { } initializer
              ? PromiseLike.Wrap(async () => _json.ToScriptValue(await initializer(cancellationToken)))
              : null
          }
      )
      .ToArray();

    return (await _handle.InvokeMethod("get", new object[] { mappedGetters }).AwaitScript(cancellationToken))
      .EnumerateScriptValues<IVariableGetResult>(
        (result) =>
        {
          if (result == Undefined.Value)
            throw new NullReferenceException(
              "The underlying storage did not return a result for one or more getters."
            );

          var status = (VariableResultStatus)result.GetScriptValue<int>("status");
          switch (status)
          {
            case VariableResultStatus.Created:
            case VariableResultStatus.Success:
            case VariableResultStatus.NotFound:
            case VariableResultStatus.Unchanged:
              var variable =
                _json.ParseVariableFragment(result) as IVariable
                ?? throw new InvalidOperationException("Unexpected result.");

              return new VariableGetSuccessResult(
                status,
                variable.Scope,
                variable.Key,
                variable.TargetId,
                variable.Classification,
                variable.Purposes,
                variable.Created,
                variable.Modified,
                variable.Accessed,
                variable.Version,
                variable.Value,
                variable.Tags,
                variable.TimeToLive
              );

            case VariableResultStatus.Denied:
            case VariableResultStatus.ReadOnly:
            case VariableResultStatus.Unsupported:
            case VariableResultStatus.Invalid:
            case VariableResultStatus.Error:
              var key =
                _json.ParseVariableFragment(result)
                ?? throw new InvalidOperationException("Unexpected result.");
              return new VariableGetErrorResult(
                status,
                key.Scope,
                key.Key,
                key.TargetId,
                result.GetScriptError("error")
              );

            default:
              throw new NotSupportedException($"Unexpected get result status: {status}.");
          }
        }
      )
      .ToArray();
  }

  public async ValueTask<VariableHeadResults> HeadAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  ) =>
    _json.ParseVariableHeadResults(
      (
        await _handle
          .InvokeMethod(
            "head",
            filters.Select(filter => _json.ToScriptValue(filter)).ToArray(),
            _json.ToScriptValue(options)
          )
          .AwaitScript(cancellationToken: cancellationToken)
      )!
    );

  ValueTask IReadOnlyVariableStorage.InitializeAsync(
    ITrackerEnvironment environment,
    CancellationToken cancellationToken
  )
  {
    return default;
  }

  public async ValueTask<bool> PurgeAsync(
    IReadOnlyList<VariableFilter> filters,
    CancellationToken cancellationToken = default
  ) =>
    (
      await _handle
        .InvokeMethod("purge", filters.Select(filter => _json.ToScriptValue(filter)).ToArray())
        .AwaitScript(cancellationToken: cancellationToken)
    ).GetScriptValue<bool>();

  public async ValueTask<VariableHeadResults> QueryAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  ) =>
    _json.ParseVariableHeadResults(
      (
        await _handle
          .InvokeMethod(
            "query",
            filters.Select(filter => _json.ToScriptValue(filter)).ToArray(),
            _json.ToScriptValue(options)
          )
          .AwaitScript(cancellationToken: cancellationToken)
      )!
    );

  public async ValueTask RenewAsync(
    VariableScope scope,
    IReadOnlyList<string> targetIds,
    CancellationToken cancellationToken = default
  )
  {
    await _handle.InvokeMethod("renew", _json.ConvertToScriptValue(targetIds)).AwaitScript(cancellationToken);
  }

  public async ValueTask<IReadOnlyList<IVariableSetResult?>> SetAsync(
    IReadOnlyList<IVariableSetter?> setters,
    CancellationToken cancellationToken = default
  )
  {
    var mappedSetters = setters
      .Select(setter => setter == null ? null : _json.ToScriptValue(setter))
      .ToArray();

    return (await _handle.InvokeMethod("set", new object[] { mappedSetters }).AwaitScript(cancellationToken))
      .EnumerateScriptValues<IVariableSetResult?>(
        (_, result, i) =>
        {
          if (result == null || result == Undefined.Value || setters[i] is not { } setter)
          {
            return null;
          }

          var status = (VariableResultStatus)result.GetScriptValue<int>("status");
          switch (status)
          {
            case VariableResultStatus.Created:
            case VariableResultStatus.Success:
            case VariableResultStatus.Unchanged:
            {
              var key =
                _json.ParseVariableFragment(result)
                ?? throw new InvalidOperationException("Unexpected result.");

              return new VariableSetSuccessResult(
                setter,
                status,
                key.Scope,
                key.Key,
                key.TargetId,
                _json.ParseVariableFragment(result.GetScriptValue("current")) as IVariable
              );
            }

            case VariableResultStatus.Conflict:
            {
              var key =
                _json.ParseVariableFragment(result)
                ?? throw new InvalidOperationException("Unexpected result.");

              return new VariableSetConflictResult(
                setter,
                status,
                key.Scope,
                key.Key,
                key.TargetId,
                _json.ParseVariableFragment(result.GetScriptValue("current")) as IVariable,
                result.GetScriptError("error")
              );
            }

            case VariableResultStatus.Denied:
            case VariableResultStatus.ReadOnly:
            case VariableResultStatus.Unsupported:
            case VariableResultStatus.Invalid:
            case VariableResultStatus.Error:
            {
              var key =
                _json.ParseVariableFragment(result)
                ?? throw new InvalidOperationException("Unexpected result.");

              return new VariableSetErrorResult(
                setter,
                status,
                key.Scope,
                key.Key,
                key.TargetId,
                result.GetScriptError("error"),
                result.GetScriptValue<bool?>("transient") == true
              );
            }

            default:
              throw new NotSupportedException($"Unexpected set result status: {status}.");
          }
        }
      )
      .ToArray();
  }

  #endregion
}
