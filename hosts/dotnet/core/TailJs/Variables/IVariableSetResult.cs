namespace TailJs.Variables;

public interface IVariableSetResult : IVariableResult
{
  IVariableSetter Source { get; }
}

public record VariableSetErrorResult(
  IVariableSetter Source,
  VariableResultStatus Status,
  VariableScope Scope,
  string Key,
  string? TargetId,
  Exception? Error,
  bool Transient = false
) : IVariableSetResult, IVariableErrorResult;

public record VariableSetConflictResult(
  IVariableSetter Source,
  VariableResultStatus Status,
  VariableScope Scope,
  string Key,
  string? TargetId,
  IVariable? Current,
  Exception? Error = null
) : VariableSetErrorResult(Source, Status, Scope, Key, TargetId, Error);

public record VariableSetSuccessResult(
  IVariableSetter Source,
  VariableResultStatus Status,
  VariableScope Scope,
  string Key,
  string? TargetId,
  IVariable? Current
) : IVariableSetResult, IVariableSuccessResult;
