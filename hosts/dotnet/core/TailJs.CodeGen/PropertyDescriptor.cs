using System.Text.Json.Nodes;

namespace TailJs.CodeGen;

public record PropertyDescriptor(
  TypeDescriptor DeclaringType,
  int SortIndex,
  string Name,
  string ClrType,
  bool IsOptional,
  string? Description,
  string? ConstantValue,
  IReadOnlyList<string>? EnumValues,
  JsonNode? Definition
)
{
  public string ClrType { get; set; } = ClrType;

  public TypeDescriptor? TypeReference { get; set; }

  public List<(string TypeName, PropertyDescriptor Property)> Overrides { get; } = new();
}
