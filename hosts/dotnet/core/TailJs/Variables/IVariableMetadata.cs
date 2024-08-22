namespace TailJs.Variables;

public interface IVariableMetadata
{
  string[]? Tags { get; }

  TimeSpan? TimeToLive { get; }
}
