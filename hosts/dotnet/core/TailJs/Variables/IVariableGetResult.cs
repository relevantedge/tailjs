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
  Variable? Variable
) : IVariableGetResult, IVariableSuccessResult;
