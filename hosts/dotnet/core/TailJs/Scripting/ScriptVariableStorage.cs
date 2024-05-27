using System.Text.Json.Nodes;
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

  public async ValueTask<IReadOnlyList<IVariableGetResult>> GetAsync(
    IReadOnlyList<IVariableGetter> getters,
    CancellationToken cancellationToken = default
  )
  {
    var mappedGetters = getters
      .Select(getter => new
      {
        scope = (int)getter.Scope,
        key = getter.Key,
        targetId = getter.TargetId,
        version = getter.Version,
        purpose = (int?)getter.Purpose,
        refresh = getter.Refresh,
        init = getter.Initializer is { } initializer
          ? PromiseLike.Wrap(async () => MapVariablePatchResult(await initializer(cancellationToken)))
          : null
      })
      .ToArray();

    return (await _handle.InvokeMethod("get", new object[] { mappedGetters }).AwaitScript(cancellationToken))
      .Enumerate<IVariableGetResult>(
        (result) =>
        {
          if (result == Undefined.Value)
            throw new NullReferenceException(
              "The underlying storage did not return a result for one or more getters."
            );

          var status = (VariableResultStatus)result.Get<int>("status");
          switch (status)
          {
            case VariableResultStatus.Created:
            case VariableResultStatus.Success:
            case VariableResultStatus.NotFound:
            case VariableResultStatus.Unchanged:
              var variable =
                TryParseVariableFragment(result) ?? throw new InvalidOperationException("Unexpected result.");

              return new VariableGetSuccessResult(
                status,
                variable.Scope,
                variable.Key,
                variable.TargetId,
                variable as Variable
              );

            case VariableResultStatus.Denied:
            case VariableResultStatus.ReadOnly:
            case VariableResultStatus.Unsupported:
            case VariableResultStatus.Invalid:
            case VariableResultStatus.Error:
              var key =
                TryParseVariableFragment(result) ?? throw new InvalidOperationException("Unexpected result.");
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

  private object? MapVariablePatchResult(VariablePatchResult? result) =>
    result == null
      ? Undefined.Value
      : new
      {
        classification = (int?)result.Classification,
        purposes = (int?)result.Purposes,
        value = _json.ToScriptValue(result.Value),
        tags = result.Tags
      };

  private IVariableKey? TryParseVariableFragment(object? variable)
  {
    if (variable == Undefined.Value || variable == null)
      return null;
    if (variable is not IScriptObject source)
      throw new InvalidOperationException("A script object was expected.");

    var scope = (VariableScope)source.Require<int>("scope");
    var key = source.Require<string>("key");
    var targetId = source.Get<string?>("targetId");
    var version = source.Get<string?>("version");
    if ((DataClassification?)source.Get<int?>("classification") is not { } classification)
    {
      return new VersionedVariableKey(scope, key, targetId, version);
    }

    return new Variable(
      scope,
      key,
      targetId,
      classification,
      (DataPurposes)source.Get<int>("purposes"),
      source.RequireDateTime("created"),
      source.RequireDateTime("modified"),
      source.RequireDateTime("accessed"),
      source.Require<string>("version"),
      _json.FromScriptValue(source["value"]),
      source.GetArray<string>("tags"),
      source.TryGetTimeSpan("ttl")
    );
  }

  public ValueTask<VariableHeadResults> HeadAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  ) => throw new NotImplementedException();

  ValueTask IReadOnlyVariableStorage.InitializeAsync(
    ITrackerEnvironment environment,
    CancellationToken cancellationToken
  ) => default;

  public ValueTask<bool> PurgeAsync(
    IReadOnlyList<VariableFilter> filters,
    CancellationToken cancellationToken = default
  ) => throw new NotImplementedException();

  public ValueTask<VariableHeadResults> QueryAsync(
    IReadOnlyList<VariableFilter> filters,
    VariableQueryOptions options,
    CancellationToken cancellationToken = default
  ) => throw new NotImplementedException();

  public ValueTask RenewAsync(VariableScope scope, IReadOnlyList<string> targetIds) =>
    throw new NotImplementedException();

  public async ValueTask<IReadOnlyList<IVariableSetResult>> SetAsync(
    IReadOnlyList<IVariableSetter> setters,
    CancellationToken cancellationToken = default
  )
  {
    var mappedSetters = setters
      .Select(setter => new
      {
        scope = (int)setter.Scope,
        key = setter.Key,
        targetId = setter.TargetId,
        value = _json.ToScriptValue(
          setter switch
          {
            VariableSetter typed => typed.Value,
            VariableAddPatch typed => typed.Value,
            VariableMinMaxPatch typed => typed.Value,
            VariableConditionalPatch typed => typed.Value,
            _ => null
          }
        ),
        classification = (int?)(setter as IVariableUsageWithDefaults)?.Classification,
        purposes = (int?)(setter as IVariableUsageWithDefaults)?.Purposes,
        tags = (setter as IVariableMetadata)?.Tags,
        ttl = (int?)((setter as IVariableMetadata)?.TimeToLive?.TotalMilliseconds),
        force = (setter as VariableSetter)?.Force,
        patch = setter is VariablePatchAction action
          ? PromiseLike.Wrap(
            async (current) =>
              MapVariablePatchResult(
                await action.Patch(TryParseVariableFragment(current) as Variable, cancellationToken)
              )
          )
          : (object?)(setter as VariableValuePatch)?.Type,
        seed = (setter as VariableAddPatch)?.Seed,
        match = (setter as VariableConditionalPatch)?.Match
      })
      .ToArray();

    return (await _handle.InvokeMethod("set", new object[] { mappedSetters }).AwaitScript(cancellationToken))
      .Enumerate<IVariableSetResult>(
        (_, result, i) =>
        {
          if (result == Undefined.Value)
            throw new NullReferenceException(
              "The underlying storage did not return a result for one or more setters."
            );

          var status = (VariableResultStatus)result.Get<int>("status");
          switch (status)
          {
            case VariableResultStatus.Created:
            case VariableResultStatus.Success:
            case VariableResultStatus.Unchanged:
            {
              var key =
                TryParseVariableFragment(result) ?? throw new InvalidOperationException("Unexpected result.");

              return new VariableSetSuccessResult(
                setters[i],
                status,
                key.Scope,
                key.Key,
                key.TargetId,
                TryParseVariableFragment(result.Get("current")) as IVariable
              );
            }

            case VariableResultStatus.Conflict:
            {
              var key =
                TryParseVariableFragment(result) ?? throw new InvalidOperationException("Unexpected result.");

              return new VariableSetConflictResult(
                setters[i],
                status,
                key.Scope,
                key.Key,
                key.TargetId,
                TryParseVariableFragment(result.Get("current")) as IVariable,
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
                TryParseVariableFragment(result) ?? throw new InvalidOperationException("Unexpected result.");

              return new VariableSetErrorResult(
                setters[i],
                status,
                key.Scope,
                key.Key,
                key.TargetId,
                result.GetScriptError("error"),
                result.Get<bool?>("transient") == true
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
