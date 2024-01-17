using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TailJs.IO;

public class DataMarkupWriterSettings
{
  public string AttributeName { get; set; } = "_t";

  public bool WriteTextMarkers { get; set; } = true;

  public bool UseReferences { get; set; }

  public bool IgnoreScopeData { get; set; }

  public bool IgnoreHtmlScope { get; set; }

  public DataMarkupWriter.EndOfBodyContent? EndOfBodyContent { get; set; }

  public JsonSerializerOptions JsonSerializerOptions { get; set; } =
    new()
    {
      PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
      DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
      Converters = { new JsonStringEnumConverter(KebabCaseNamingPolicy.Instance) }
    };
}
