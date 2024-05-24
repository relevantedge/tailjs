namespace TailJs.Variables;

public interface IVariableVersion
{
  string? Version { get; }

  DateTime? Created { get; }

  DateTime? Modified { get; }
}
