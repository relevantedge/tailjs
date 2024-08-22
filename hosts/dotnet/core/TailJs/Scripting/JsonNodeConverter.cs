using System.Collections;
using System.Numerics;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.ClearScript;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace TailJs.Scripting;

internal class JsonNodeConverter
{
  public static readonly JsonSerializerOptions SerializerOptions =
    new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

  private readonly Func<string, object?> _parse;
  private readonly Func<object?, string> _stringify;
  private readonly Func<object?[], object?> _combine;
  private readonly Func<Exception, object?> _exceptionToError;

  public JsonNodeConverter(
    Func<string, object?> parse,
    Func<object?, string> stringify,
    Func<object?[], object?> combine,
    Func<Exception, object?> exceptionToError
  )
  {
    _parse = parse;
    _stringify = stringify;
    _combine = combine;
    _exceptionToError = exceptionToError;
  }

  public JsonNode? ConvertFromScriptValue(object? value) =>
    value switch
    {
      null => null,
      string stringValue => stringValue,
      bool boolValue => boolValue,
      int intValue => intValue,
      long longValue => longValue,
      double floatValue => floatValue,
      decimal decimalValue => decimalValue,
      BigInteger bigInteger => bigInteger.ToString(),
      DateTime dateTimeValue => ((DateTimeOffset)dateTimeValue).ToUnixTimeMilliseconds(),
      DateTimeOffset dateTimeOffsetValue => dateTimeOffsetValue.ToUnixTimeMilliseconds(),
      JsonNode node => node,
      Undefined => null,
      IScriptObject scriptObject => JsonNode.Parse(_stringify(scriptObject)),
      _ => throw new NotSupportedException($"Unknown value type {value.GetType().FullName}")
    };

  public object? ConvertToScriptValue(object? value) =>
    value switch
    {
      null => Undefined.Value,
      string or bool or int or long or double or decimal or Undefined or IScriptObject => value,
      DateTime dateTime => ((DateTimeOffset)dateTime.ToUniversalTime()).ToUnixTimeMilliseconds(),
      TimeSpan timeSpan => (long)timeSpan.TotalMilliseconds,
      Exception ex => _exceptionToError(ex),
      IEnumerable list => ToScriptArray(list),
      JsonNode node => ConvertToScriptValue(node),
      _ => _parse(Serialize(value))
    };

  private object ToScriptArray(IEnumerable list)
  {
    if (list is Array)
      return list;
    var items = new List<object?>();
    foreach (var item in list)
    {
      items.Add(ConvertToScriptValue(item));
    }

    return items.ToArray();
  }

  public object? Combine(params object?[] values) => _combine(values.Select(ConvertToScriptValue).ToArray());

  public object? ConvertToScriptValue(JsonNode? value)
  {
    if (value == null)
    {
      return Undefined.Value;
    }

    if (value is not JsonValue jsonValue)
    {
      return _parse(value.ToJsonString(SerializerOptions));
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

  public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, SerializerOptions);
}
