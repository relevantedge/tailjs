using System.Text.Json.Nodes;

namespace TailJs.Variables;

public interface IVariableGetResult : IVariableResult { }

public record VariableGetErrorResult(
  VariableResultStatus Status,
  VariableScope Scope,
  string Key,
  string? TargetId,
  Exception? Error
) : IVariableGetResult, IVariableErrorResult;

public record VariableGetSuccessResult(
  VariableResultStatus Status,
  VariableScope Scope,
  string Key,
  string? TargetId,
  DataClassification Classification,
  DataPurposes Purposes,
  DateTime Created,
  DateTime Modified,
  DateTime Accessed,
  string Version,
  JsonNode? Value,
  string[]? Tags = null,
  TimeSpan? TimeToLive = null
)
  : Variable(
    Scope,
    Key,
    TargetId,
    Classification,
    Purposes,
    Created,
    Modified,
    Accessed,
    Version,
    Value,
    Tags,
    TimeToLive
  ),
    IVariableGetResult,
    IVariableSuccessResult;
