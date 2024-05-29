using Microsoft.ClearScript;
using TailJs.Variables;

namespace TailJs.Scripting;

internal static class VariableHelpers
{
  internal static object? ToScriptValue(this JsonNodeConverter json, VariablePatchResult? result) =>
    result == null
      ? Undefined.Value
      : new
      {
        classification = (int?)result.Classification,
        purposes = (int?)result.Purposes,
        value = json.ConvertToScriptValue(result.Value),
        tags = result.Tags
      };

  internal static object? ToScriptValue(this JsonNodeConverter json, IVariableKey? variable) =>
    variable == null
      ? Undefined.Value
      : new
      {
        scope = (int)variable.Scope,
        key = variable.Key,
        targetId = variable.TargetId
      };

  internal static object? ToScriptValue(this JsonNodeConverter json, IVariable? variable) =>
    variable == null
      ? Undefined.Value
      : json.Combine(
        json.ToScriptValue((IVariableKey)variable),
        new
        {
          scope = (int)variable.Scope,
          key = variable.Key,
          targetId = variable.TargetId,
          classification = (int)variable.Classification,
          purposes = (int)variable.Purposes,
          created = json.ConvertToScriptValue(variable.Created),
          modified = json.ConvertToScriptValue(variable.Modified),
          accessed = json.ConvertToScriptValue(variable.Accessed),
          version = variable.Version,
          value = json.ConvertToScriptValue(variable.Value),
          tags = variable.Tags,
          ttl = (int?)variable.TimeToLive?.TotalMilliseconds
        }
      );

  public static object? ToScriptValue(this JsonNodeConverter json, IVariableGetResult? variable) =>
    variable == null
      ? Undefined.Value
      : json.Combine(
        new { status = (int)variable.Status },
        variable switch
        {
          VariableGetSuccessResult success => json.ToScriptValue((IVariable)success),
          VariableGetErrorResult error
            => json.Combine(
              json.ToScriptValue((IVariableKey)error),
              new { error = json.ConvertToScriptValue(error.Error) }
            ),
          _ => throw new ArgumentOutOfRangeException(nameof(variable))
        }
      );

  public static IVariableKey? TryParseVariableFragment(this JsonNodeConverter json, object? variable)
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
      json.ConvertFromScriptValue(source["value"]),
      source.GetArray<string>("tags"),
      source.TryGetTimeSpan("ttl")
    );
  }

  public static VariablePatchResult? TryParseVariablePatchResult(
    this JsonNodeConverter json,
    object? result
  ) =>
    result is not IScriptObject
      ? null
      : new VariablePatchResult(
        json.ConvertFromScriptValue(result.Get("value")),
        (DataClassification?)result.TryGet<int>("classification"),
        (DataPurposes?)result.TryGet<int>("purposes"),
        result.Get<string[]>(),
        result.TryGetTimeSpan("ttl")
      );
}
