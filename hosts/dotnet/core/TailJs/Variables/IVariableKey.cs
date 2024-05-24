namespace TailJs.Variables;

public interface IVariableKey
{
  VariableScope Scope { get; }

  string Key { get; }

  string? TargetId { get; }
}

public record VariableKey(VariableScope Scope, string Key, string? TargetId = null) : IVariableKey;
