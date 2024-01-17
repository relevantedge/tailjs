using System.Collections;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Text.Json.Nodes;

using Microsoft.ClearScript;

namespace TailJs.Scripting;

public class TrackerVariableCollection : ITrackerVariableCollection
{
  private readonly IScriptObject _requestHandler;
  private readonly IScriptObject _tracker;

  internal TrackerVariableCollection(IScriptObject requestHandler, IScriptObject tracker)
  {
    _requestHandler = requestHandler;
    _tracker = tracker;
  }

  public JsonNode? this[string name]
  {
    get => JsonNode.Parse(_requestHandler.InvokeMethod("getVariable", _tracker, name).Require<string>());
    set => _requestHandler.InvokeMethod("setVariable", _tracker, name, value);
  }

  public T? Get<T>(string name) => TryGetValue<T>(name, out var value) ? value! : default;

  public string? GetString(string name) => this[name]?.ToString();

  public void Set<T>(string name, T value) =>
    _requestHandler.InvokeMethod(
      "setVariable",
      _tracker,
      name,
      value == null ? null : JsonSerializer.Serialize(value)
    );

  public bool TryGetValue<T>(
    string name,
#if NETSTANDARD2_1_OR_GREATER || NET5_0_OR_GREATER
    [MaybeNullWhen(false)]
#endif
    out T value
  )
  {
    var scriptValue = _requestHandler.InvokeMethod("getVariable", _tracker, name).Require<string>();
    return (value = JsonSerializer.Deserialize<T>(scriptValue)!) != null;
  }

  #region IEnumerable<KeyValuePair<string,JsonNode>> Members

  public IEnumerator<KeyValuePair<string, JsonNode>> GetEnumerator() =>
    _requestHandler
      .InvokeMethod("getVariables", _tracker)
      .Enumerate()
      .Select(
        kv =>
          new KeyValuePair<string, JsonNode?>(
            kv.Value.Get<string>("key"),
            JsonNode.Parse(kv.Value.Require<string>("value"))
          )
      )
      .Where(kv => kv.Value != null)
      .GetEnumerator()!;

  IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

  #endregion
}
