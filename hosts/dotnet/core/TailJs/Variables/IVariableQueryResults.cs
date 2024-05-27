namespace TailJs.Variables;

public interface IVariableQueryResults<out T>
  where T : IVariableHeader
{
  long? Count { get; }

  IReadOnlyList<T> Results { get; }

  string? Cursor { get; }
}

public record VariableHeadResults(long? Count, IReadOnlyList<IVariableHeader> Results, string? Cursor)
  : IVariableQueryResults<IVariableHeader>;

public record VariableQueryResults(long? Count, IReadOnlyList<Variable> Results, string? Cursor)
  : IVariableQueryResults<Variable>;
