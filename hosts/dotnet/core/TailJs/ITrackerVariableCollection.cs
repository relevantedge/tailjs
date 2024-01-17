using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Nodes;

namespace TailJs;

public interface ITrackerVariableCollection : IEnumerable<KeyValuePair<string, JsonNode>>
{
  JsonNode? this[string name] { get; set; }

  T? Get<T>(string name);

  string? GetString(string name);

  void Set<T>(string name, T value);

  bool TryGetValue<T>(
    string name,
#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER
    [MaybeNullWhen(false)]
#endif
    out T value
  );
}
