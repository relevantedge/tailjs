using System.Text.Json.Nodes;

namespace TailJs.Variables;

public interface IVariableSetter : IVariableKey { }

public record VariableSetter(
  VariableScope Scope,
  string Key,
  string? TargetId,
  JsonNode? Value,
  DataClassification? Classification = null,
  DataPurposes? Purposes = null,
  string? Version = null,
  string[]? Tags = null,
  TimeSpan? TimeToLive = null,
  bool Force = false
) : IVariableSetter, IVersionedVariableKey, IVariableUsageWithDefaults, IVariableMetadata
{
  internal object? ScriptSource { get; set; }
}

public record VariablePatchAction(
  VariableScope Scope,
  string Key,
  string? TargetId,
  Func<IVariable?, CancellationToken, ValueTask<VariablePatchResult?>> Patch,
  DataClassification? Classification = null,
  DataPurposes? Purposes = null
) : IVariableSetter
{
  internal object? ScriptSource { get; set; }
}

public enum VariablePatchType
{
  Add = 0,
  Min = 1,
  Max = 2,
  IfMatch = 3,
  IfNoneMatch = 4,
}

public abstract record VariableValuePatch(
  VariablePatchType Type,
  VariableScope Scope,
  string Key,
  string? TargetId,
  DataClassification? Classification,
  DataPurposes? Purposes,
  string[]? Tags,
  TimeSpan? TimeToLive
) : IVariableSetter, IVariableUsageWithDefaults, IVariableMetadata
{
  internal object? ScriptSource { get; set; }
}

public record VariableAddPatch(
  VariableScope Scope,
  string Key,
  string? TargetId,
  double Value,
  double? Seed,
  DataClassification? Classification = null,
  DataPurposes? Purposes = null,
  string[]? Tags = null,
  TimeSpan? TimeToLive = null
)
  : VariableValuePatch(
    VariablePatchType.Add,
    Scope,
    Key,
    TargetId,
    Classification,
    Purposes,
    Tags,
    TimeToLive
  );

public record VariableMinMaxPatch(
  VariableScope Scope,
  string Key,
  string? TargetId,
  decimal Value,
  bool IfGreater,
  DataClassification? Classification = null,
  DataPurposes? Purposes = null,
  string[]? Tags = null,
  TimeSpan? TimeToLive = null
)
  : VariableValuePatch(
    IfGreater ? VariablePatchType.Max : VariablePatchType.Min,
    Scope,
    Key,
    TargetId,
    Classification,
    Purposes,
    Tags,
    TimeToLive
  );

public record VariableConditionalPatch(
  VariableScope Scope,
  string Key,
  string? TargetId,
  JsonNode? Value,
  JsonNode? Match,
  bool IfMatch = true,
  DataClassification? Classification = null,
  DataPurposes? Purposes = null,
  string[]? Tags = null,
  TimeSpan? TimeToLive = null
)
  : VariableValuePatch(
    IfMatch ? VariablePatchType.IfMatch : VariablePatchType.IfNoneMatch,
    Scope,
    Key,
    TargetId,
    Classification,
    Purposes,
    Tags,
    TimeToLive
  );
