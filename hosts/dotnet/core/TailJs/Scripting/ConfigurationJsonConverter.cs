using System.Text.Json;
using System.Text.Json.Serialization;

using Microsoft.Extensions.Configuration;

namespace TailJs.Scripting;

internal class ConfigurationJsonConverter : JsonConverter<IConfiguration>
{
  private ConfigurationJsonConverter() { }

  public static ConfigurationJsonConverter Instance { get; } = new();

  public override IConfiguration Read(
    ref Utf8JsonReader reader,
    Type typeToConvert,
    JsonSerializerOptions options
  ) => throw new NotImplementedException();

  public override void Write(Utf8JsonWriter writer, IConfiguration value, JsonSerializerOptions options)
  {
    if (value is IConfigurationSection { Value: { } stringValue })
    {
      writer.WriteStringValue(stringValue);
      return;
    }

    writer.WriteStartObject();
    foreach (var child in value.GetChildren())
    {
      var key = options.PropertyNamingPolicy?.ConvertName(child.Key) ?? child.Key;
      writer.WritePropertyName(key);
      Write(writer, child, options);
    }

    writer.WriteEndObject();
  }
}
