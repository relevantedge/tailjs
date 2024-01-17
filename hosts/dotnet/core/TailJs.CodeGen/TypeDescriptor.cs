using System.Text.Json.Nodes;

namespace TailJs.CodeGen;

public record TypeDescriptor(string Name, bool IsAnonymous, JsonNode Definition, string? Description)
{
  public Dictionary<string, PropertyDescriptor> Properties { get; } = new();

  public List<TypeDescriptor> AnonymousTypes { get; } = new();

  public List<TypeDescriptor> BaseTypes { get; } = new();

  public List<TypeDescriptor> Subtypes { get; } = new();

  public bool IsConcrete { get; internal set; }

  public bool IsBaseInterface { get; internal set; }

  public bool IsSecondaryBaseType { get; internal set; }

  public IEnumerable<TypeDescriptor> ExpandBaseTypes() =>
    BaseTypes.Expand(type => type.BaseTypes.Select(baseType => baseType));

  public IEnumerable<TypeDescriptor> ExpandSubtypes() => Subtypes.Expand(type => type.Subtypes);
}
