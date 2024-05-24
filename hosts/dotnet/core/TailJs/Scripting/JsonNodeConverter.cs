using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.ClearScript;
using Newtonsoft.Json;

namespace TailJs.Scripting;

public class JsonNodeConverter
{
  private readonly Func<string, object?> _parse;
  private readonly Func<object?, string> _stringify;

  public JsonNodeConverter(Func<string, object?> parse, Func<object?, string> stringify)
  {
    _parse = parse;
    _stringify = stringify;
  }

  public JsonNode? FromScriptValue(object? value) =>
    value switch
    {
      null => null,
      string stringValue => stringValue,
      bool boolValue => boolValue,
      int intValue => intValue,
      long longValue => longValue,
      double floatValue => floatValue,
      DateTime dateTimeValue => ((DateTimeOffset)dateTimeValue).ToUnixTimeMilliseconds(),
      DateTimeOffset dateTimeOffsetValue => dateTimeOffsetValue.ToUnixTimeMilliseconds(),
      IScriptObject scriptObject => JsonNode.Parse(_stringify(scriptObject)),
      _
        => value == Undefined.Value
          ? null
          : throw new NotSupportedException($"Unknown value type {value.GetType().FullName}")
    };

  public object? ToScriptValue(JsonNode? value, bool camelCase = true)
  {
    if (value == null)
    {
      return Undefined.Value;
    }

    if (value is not JsonValue jsonValue)
    {
      return _parse(
        value.ToJsonString(
          new JsonSerializerOptions() { PropertyNamingPolicy = camelCase ? JsonNamingPolicy.CamelCase : null }
        )
      );
    }

    var element = jsonValue.GetValue<JsonElement>();
    return element.ValueKind switch
    {
      JsonValueKind.Undefined => Undefined.Value,
      JsonValueKind.String => element.GetString(),
      JsonValueKind.Number => element.TryGetInt64(out var integerValue) ? integerValue : element.GetDouble(),
      JsonValueKind.True => true,
      JsonValueKind.False => false,
      JsonValueKind.Null => null,
      _ => throw new NotSupportedException($"Unsupported value kind: {element.ValueKind}.")
    };
  }
}
