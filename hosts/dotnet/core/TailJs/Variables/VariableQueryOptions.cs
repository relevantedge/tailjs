namespace TailJs.Variables;

public record VariableQueryCursorOptions(string? Previous, bool Include = true);

public interface IVersionedVariableKey : IVariableKey
{
  string? Version { get; }
}

public record VersionedVariableKey(VariableScope Scope, string Key, string? TargetId, string? Version)
  : IVersionedVariableKey;

public record VariableQueryOptions(
  bool Count = true,
  long? Top = null,
  VariableQueryCursorOptions? Cursor = null,
  DateTime? IfModifiedSince = null,
  IReadOnlyList<IVersionedVariableKey>? IfNoneMatch = null
);

public record VariableClassificationFilter(
  DataClassification? Min = null,
  DataClassification? Max = null,
  IReadOnlyList<DataClassification>? Levels = null
);

public record VariableFilter(
  IReadOnlyList<string>? TargetIds = null,
  IReadOnlyList<VariableScope>? Scopes = null,
  IReadOnlyList<string>? Keys = null,
  IReadOnlyList<string>? Tags = null,
  VariableClassificationFilter? Classifications = null,
  DataPurposes? Purposes = null
);
