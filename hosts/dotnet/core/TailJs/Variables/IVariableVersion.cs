namespace TailJs.Variables;

public interface IVariableVersion : IVersionedVariableKey
{
  DateTime Created { get; }

  DateTime Modified { get; }

  DateTime Accessed { get; }

  new string Version { get; }
}
