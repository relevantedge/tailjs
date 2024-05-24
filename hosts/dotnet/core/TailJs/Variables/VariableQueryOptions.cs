namespace TailJs.Variables;

public record VariableQueryCursorOptions(string? Previous, bool Include = true);

public record VersionedVariableKey(
  VariableScope Scope,
  string Key,
  string? TargetId = null,
  string? Version = null
) : VariableKey(Scope, Key, TargetId);

public record VariableQueryOptions(
  bool Count = true,
  long? Top = null,
  VariableQueryCursorOptions? Cursor = null,
  DateTime? IfModifiedSince = null,
  IReadOnlyList<VersionedVariableKey>? IfNoneMatch = null
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
