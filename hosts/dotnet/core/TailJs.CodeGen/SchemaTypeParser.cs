using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace TailJs.CodeGen;

public class SchemaTypeParser
{
  private readonly Dictionary<string, TypeDescriptor> _typeDescriptors = new();
  private readonly Dictionary<string, string> _markerTypes = new();

  public IEnumerable<TypeDescriptor> Types => _typeDescriptors.Values;

  public void Parse(JsonNode schema)
  {
    foreach (var (name, definition) in schema.Properties("definitions"))
    {
      if (definition.Get<string?>("type") is { } type && type != "object")
      {
        _markerTypes.Add(name, type);
      }
    }

    var rootTypes = MapTypes(schema.Properties("definitions"), false).ToList();

    var propertyValueTypes = new HashSet<string>();
    foreach (var property in _typeDescriptors.Values.SelectMany(type => type.Properties.Values))
    {
      var referencedTypeName = property.ClrType;
      if (referencedTypeName.EndsWith("?"))
      {
        referencedTypeName = referencedTypeName[..^1];
      }

      if (_typeDescriptors.TryGetValue(referencedTypeName, out var referencedType))
      {
        property.TypeReference = referencedType;
        propertyValueTypes.Add(referencedType.Name);
      }
    }

    foreach (var type in rootTypes)
    {
      foreach (
        var (index, baseType) in type.Definition
          .Items("allOf")
          .Select(
            item =>
              GetRefTypeName(item.Get<string?>("$ref")) is { } refTypeName
              && _typeDescriptors.TryGetValue(refTypeName, out var baseType)
                ? baseType
                : null
          )
          .NotNull()
          .Rank()
      )
      {
        type.BaseTypes.Add(baseType);
        baseType.Subtypes.Add(type);

        baseType.IsSecondaryBaseType = baseType.IsSecondaryBaseType || index > 0;
        if (propertyValueTypes.Contains(baseType.Name))
        {
          baseType.IsBaseInterface = true;
        }
        else if (index > 0)
        {
          // Per convention, an interface that is only used as the first extended interface in sub types is interpreted as a base type.
          // Typescript: interface SubType extends BaseType, Interface1, Interface2 ... {}
          baseType.IsConcrete = false;
        }
      }
    }

    // Types where sub types overrides a property to a constant are not concrete.
    // This is a generalized way to capture TrackedEvent and CommerceEvent as abstract.
    foreach (
      var type in _typeDescriptors.Values.Where(
        type =>
          type.ExpandBaseTypes() // This is not very efficient, but since it is used for code-gen, it doesn't really matter.
            .Prepend(type)
            .Any(
              baseType =>
                baseType.Properties.Any(
                  kv =>
                    kv.Value.ConstantValue == null
                    && type.Subtypes.Any(
                      subtype =>
                        subtype.Properties.TryGetValue(kv.Key, out var overriddenProperty)
                        && overriddenProperty.ConstantValue != null
                    )
                )
            ) && !propertyValueTypes.Contains(type.Name) // Types used directly as property values must always have a concrete type.
      )
    )
    {
      type.IsConcrete = false;
    }

    foreach (var type in rootTypes)
    {
      if (
        type is { IsSecondaryBaseType: false, IsBaseInterface: true }
        && type.ExpandSubtypes().All(type => type.IsConcrete)
      )
      {
        type.IsBaseInterface = false;
      }
    }

    foreach (var type in rootTypes)
    {
      UpdateInterfaceStatus(type, !type.IsConcrete || type.IsBaseInterface);
    }

    foreach (var anyType in _typeDescriptors.Values.Where(type => IsAnyType(type.Definition)).ToList())
    {
      _typeDescriptors.Remove(anyType.Name);
      if (anyType.Name == "ExternalUse")
      {
        foreach (var subtype in anyType.Subtypes)
        {
          // Direct sub types
          subtype.IsConcrete = true;
        }
      }
      foreach (var subtype in anyType.ExpandSubtypes())
      {
        subtype.BaseTypes.Remove(anyType);
      }
    }

    foreach (var property in _typeDescriptors.Values.SelectMany(type => type.Properties.Values))
    {
      if (property.TypeReference is { IsConcrete: false })
      {
        property.ClrType = $"I{property.ClrType}";
      }
    }

    void UpdateInterfaceStatus(TypeDescriptor typeDescriptor, bool needsInterface)
    {
      if (needsInterface)
      {
        typeDescriptor.IsBaseInterface = true;
        foreach (var baseType in typeDescriptor.BaseTypes)
        {
          UpdateInterfaceStatus(baseType, true);
        }
      }
    }

    IEnumerable<TypeDescriptor> MapTypes(
      IEnumerable<KeyValuePair<string, JsonNode?>> definitions,
      bool anonymous
    )
    {
      foreach (var (name, sourceDefinition) in definitions)
      {
        if (sourceDefinition == null || _markerTypes.ContainsKey(name))
          continue;
        var definition = GetOwnDefinition(sourceDefinition);

        if (TryGetDictionaryValue(definition) != null)
        {
          continue;
        }
        if (_typeDescriptors.TryGetValue(name, out var current))
        {
          yield return current;
          continue;
        }

        _typeDescriptors.Add(
          name,
          current = new TypeDescriptor(
            name,
            anonymous,
            sourceDefinition,
            sourceDefinition.Get<string?>("description")
          )
          {
            IsConcrete = true // Assume concrete until proven otherwise.
          }
        );

        foreach (var property in ParseProperties(current, definition))
        {
          current.Properties.Add(property.Name, property);
        }

        current.AnonymousTypes.AddRange(
          MapTypes(
            current.Properties.Values
              .Where(prop => prop.Definition.Get<string?>("type") == "object")
              .Select(
                prop => KeyValuePair.Create(GetAnonymousPropertyTypeName(name, prop.Name), prop.Definition)
              ),
            true
          )
        );

        yield return current;
      }
    }
  }

  private IEnumerable<PropertyDescriptor> ParseProperties(
    TypeDescriptor declaringType,
    JsonNode typeDefinition
  )
  {
    var i = 0;
    foreach (var prop in GetPropertyDefinitions(typeDefinition))
    {
      if (prop.Value == null || GetClrType(prop.Value, prop.Key) is not { } clrType)
      {
        continue;
      }

      var description = new List<string?> { prop.Value.Get<string?>("description") };

      if (clrType.StartsWith("DateTime"))
      {
        clrType = $"long{clrType[8..]}";
        description.Add("\nThis is a Unix timestamp (milliseconds).");
      }

      if (prop.Value.Get<string?>("default") is { Length: > 0 } defaultValue)
      {
        description.Add($"\nThe default value is {defaultValue}.");
      }

      yield return new(
        declaringType,
        i++,
        PascalCase(prop.Key),
        clrType,
        clrType.EndsWith('?'),
        string.Join("\n", description.NotNull()),
        prop.Value.Get<string?>("const") is { } constantValue
          ? JsonSerializer.Serialize(constantValue)
          : null,
        prop.Value.Navigate("enum") is JsonArray enumValues
          ? enumValues.Select(item => item.Get<string>()).NotNull().ToList()
          : null,
        prop.Value
      );

      string? GetClrType(JsonNode? propertyDefinition, string propertyName)
      {
        if (GetNonNullable(propertyDefinition, propertyName) is not { } nonNullable)
        {
          return null;
        }

        return
          propertyDefinition?.Items<string>("..", "..", "required").Any(value => value == propertyName)
          == true
          ? nonNullable
          : $"{nonNullable}?";

        string? GetNonNullable(JsonNode? propertyDefinition, string propertyName)
        {
          if (propertyDefinition == null)
          {
            return null;
          }

          var refType = GetRefTypeName(propertyDefinition.Get<string>("$ref"));
          if (refType != null)
          {
            return refType switch
            {
              "UUID" => "Guid",
              "LocalID" => "string",
              "Timestamp" => "DateTime",
              "Duration" => "TimeSpan",
              "Integer" => "long",
              "Float" => "double",
              "Decimal" => "decimal",
              "Percentage" => "double",
              _ => _markerTypes.TryGetValue(refType, out var unwrappedType) ? unwrappedType : $"{refType}"
            };
          }

          if (propertyDefinition.Get<string?>("type") is { } type)
          {
            if (type == "array")
            {
              return $"List<{GetClrType(propertyDefinition.Navigate("items"), propertyName)}>";
            }

            if (
              type == "object"
              && propertyDefinition.Navigate("additionalProperties") is JsonObject dictionaryValue
            )
            {
              return $"Dictionary<string, {GetClrType(dictionaryValue, propertyName)}>";
            }

            return type switch
            {
              "string" => "string",
              "boolean" => "bool",
              "number" => "double",
              "object"
                => IsAnyType(propertyDefinition)
                  ? "object"
                  : GetAnonymousPropertyTypeName(declaringType.Name, propertyName),
              _ => throw new InvalidOperationException($"Unsupported type {type}")
            };
          }

          return null;
          throw new InvalidOperationException(
            "The type definition neither has a 'type' property nor '$ref' property."
          );
        }
      }
    }
  }

  private static string GetAnonymousPropertyTypeName(string typeName, string propertyName) =>
    $"{typeName}{PascalCase(propertyName)}";

  public static string PascalCase(string camelCased) =>
    Regex.Replace(
      camelCased.Length > 0 && char.IsLower(camelCased[0])
        ? $"{char.ToUpper(camelCased[0])}{camelCased[1..]}"
        : camelCased,
      @"\-(?<Letter>.)?",
      (match) => match.Groups["Letter"].Value.ToUpperInvariant()
    );

  private static JsonNode GetOwnDefinition(JsonNode definition) =>
    definition.Items("allOf").FirstOrDefault(definition => definition.Get<string?>("type") == "object")
    ?? definition;

  private static JsonNode? TryGetDictionaryValue(JsonNode? definition) =>
    definition.Navigate("additionalProperties") as JsonObject;

  private static string? GetRefTypeName(string? reference)
  {
    if (reference == null)
      return null;

    if (!reference.StartsWith("#/definitions/"))
    {
      throw new InvalidOperationException($"Invalid type reference: {reference}.");
    }

    return reference[14..];
  }

  private static bool IsAnyType(JsonNode? definition) =>
    definition.Get<string?>("type") == "object"
    && !definition.Properties("properties").Any()
    && definition.Navigate("additionalProperties") == null;

  private static IEnumerable<KeyValuePair<string, JsonNode?>> GetPropertyDefinitions(
    JsonNode? objectDefinition
  ) =>
    objectDefinition == null
      ? Enumerable.Empty<KeyValuePair<string, JsonNode?>>()
      : objectDefinition
        .Properties("properties")
        .Concat(objectDefinition.Items("allOf").SelectMany(GetPropertyDefinitions));
}
