namespace TailJs.Variables;

public interface IVariableGetter : IVariableKey
{
  DataPurposes? Purpose { get; }
  string? Version { get; }
  bool Refresh { get; }
  Func<CancellationToken, ValueTask<VariablePatchResult>>? Initializer { get; }
}

public record VariableGetter(
  VariableScope Scope,
  string Key,
  string? TargetId,
  DataPurposes? Purpose = null,
  string? Version = null,
  bool Refresh = false,
  Func<CancellationToken, ValueTask<VariablePatchResult>>? Initializer = null
) : IVariableGetter
{
  public static implicit operator VariableGetter(VariableKey key) => new(key.Scope, key.Key, key.TargetId);
}
