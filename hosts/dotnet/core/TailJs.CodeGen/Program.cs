// See https://aka.ms/new-console-template for more information

using System.CodeDom.Compiler;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Web;

using TailJs.CodeGen;

var jsonSchema = args.Length >= 1 ? args[0] : @"./npm/schema.json";
var ns = args.Length >= 2 ? args[1] : "TailJs.Model";

var destination = args.Length >= 3 ? args[2] : "../../../../TailJs/Model"; // "C:/Temp/TailJs.Model";

//var destination = "C:/Temp/TailJs.Model";

Directory.CreateDirectory(destination);
if (Directory.GetDirectories(destination).Length > 0)
{
  Console.Error.WriteLine(
    "The destination directory contains sub directories. Are you sure this is right? (No files were deleted)."
  );
}
else
{
  foreach (var file in Directory.GetFiles(destination))
  {
    File.Delete(file);
  }
}

await GenerateCode(
  JsonNode.Parse(await File.ReadAllTextAsync(jsonSchema)),
  async (type, generatedCode) =>
  {
    await File.WriteAllTextAsync(
      Path.Combine(destination, $"{(type.IsBaseInterface ? "I" : "")}{type.Name}.cs"),
      generatedCode
    );
  }
);

string? GetEnumName(PropertyDescriptor descriptor) =>
  descriptor.EnumValues == null ? null : $"{descriptor.DeclaringType.Name}{descriptor.Name}";

string GetClrTypeName(PropertyDescriptor descriptor) =>
  GetEnumName(descriptor) is { } enumName
    ? descriptor.ClrType.EndsWith("?")
      ? $"{enumName}?"
      : enumName
    : descriptor.ClrType;

async ValueTask GenerateCode(JsonNode? schema, Func<TypeDescriptor, string, ValueTask> writeTypeCode)
{
  if (schema == null)
    return;

  var typeParser = new SchemaTypeParser();
  typeParser.Parse(schema);

  var types = typeParser.Types.ToDictionary(type => type.Name);

  foreach (var type in typeParser.Types.Where(type => !type.IsAnonymous))
  {
    var generatedCode = new StringWriter();
    var writer = new IndentedTextWriter(generatedCode, "  ") { NewLine = "\n" };

    writer.AppendLine("using System;").AppendLine();
    writer.Append("namespace ").Append(ns).AppendLine(";").AppendLine();

    if (type.IsBaseInterface)
    {
      AppendSummary(type.Description);
      writer.Append("public interface I").Append(type.Name);
      if (string.Join(", ", type.BaseTypes.Select(type => $"I{type.Name}")) is { Length: > 0 } inherits)
      {
        writer.Append(" : ").Append(inherits);
      }

      writer.AppendLine().AppendLine("{").Indent();

      // Don't overwrite the base types property in the interface.
      var baseTypeProperties = type.ExpandBaseTypes()
        .SelectMany(type => type.Properties.Values)
        .GroupBy(prop => prop.Name)
        .Select(group => group.Last())
        .ToDictionary(prop => prop.Name);

      foreach (
        var (ix, property) in type.Properties.Values
          .Where(
            property =>
              !baseTypeProperties.TryGetValue(property.Name, out var baseProperty)
              || baseProperty.ClrType != property.ClrType
          )
          .OrderBy(property => property.SortIndex)
          .Rank()
      )
      {
        writer.AppendLineIf(ix > 0);

        AppendSummary(property.Description);
        if (baseTypeProperties.TryGetValue(property.Name, out var baseProperty))
        {
          if (property.ClrType != baseProperty.ClrType[..^1])
          {
            throw new NotSupportedException(
              $"Subtypes can only change the nullability of base type properties. The change from '{baseProperty.ClrType}' to '{property.ClrType}' is not supported."
            );
          }

          writer.Append("new ");
        }

        writer
          .Append(GetClrTypeName(property))
          .Append(" ")
          .Append(property.Name)
          .Append(" { get; }")
          .AppendLine();
      }

      writer.Outdent().AppendLine("}");
      writer.AppendLine();
    }

    var concreteTypes = type.AnonymousTypes.Expand(type => type.AnonymousTypes);

    if (type.IsConcrete)
    {
      concreteTypes = concreteTypes.Prepend(type);
    }

    var hasAnonymous = false;

    foreach (var concreteType in concreteTypes)
    {
      if (concreteType.IsAnonymous && hasAnonymous != (hasAnonymous = true))
      {
        writer.AppendLine("#region Anonymous types").AppendLine().Indent();
      }

      (
        IReadOnlyList<PropertyDescriptor> Properties,
        IReadOnlyList<PropertyDescriptor> CtorProperties
      ) GetAllProperties(TypeDescriptor concreteType)
      {
        var properties = concreteType
          .ExpandBaseTypes()
          .Append(concreteType)
          .SelectMany(type => type.Properties.Values.OrderBy(property => property.SortIndex))
          .GroupBy(property => property.Name)
          .Select(group => group.Last())
          .OrderBy(property => property.IsOptional)
          .ToList();

        var ctorProperties = properties.Where(prop => prop.ConstantValue == null).ToList();
        return (properties, ctorProperties);
      }

      var (properties, ctorProperties) = GetAllProperties(concreteType);

      AppendSummary(concreteType.Description);
      writer.Append("public record ").Append(concreteType.Name).Append("(").Indent();
      foreach (var (ix, prop) in ctorProperties.Rank())
      {
        writer.AppendLine(ix > 0 ? "," : "");
        writer.Append(GetClrTypeName(prop)).Append(" ").Append(prop.Name);
        if (prop.IsOptional)
        {
          writer.Append(" = null");
        }
      }

      writer.AppendLine().Outdent().Append(")");

      foreach (var (typeIndex, baseType) in concreteType.BaseTypes.Rank())
      {
        writer.Append(typeIndex == 0 ? " : " : ", ");
        if (typeIndex == 0 && baseType is { IsConcrete: true, IsBaseInterface: false })
        {
          writer.Indent().Append(baseType.Name);
          var baseCtorProperties = GetAllProperties(baseType).CtorProperties;

          if (baseCtorProperties.Count > 0)
          {
            writer.Append("(").Indent();
            foreach (var (propIndex, baseProp) in baseCtorProperties.Rank())
            {
              writer.AppendLine(propIndex > 0 ? "," : "");
              writer.Append(baseProp.Name).Append(": ").Append(baseProp.Name);
            }

            writer.AppendLine().Outdent().Append(")");
          }

          writer.Outdent();

          var usedBaseProperties = baseCtorProperties.ToHashSet();

          properties = properties.Where(property => !usedBaseProperties.Contains(property)).ToList();
        }
        else
        {
          writer.Append("I").Append(baseType.Name);
        }
      }

      if (properties.Count > 0)
      {
        writer.AppendLine().AppendLine("{").Indent();

        // Also add mutable getters and setters to allow for different coding styles.
        foreach (var (ix, property) in properties.Rank())
        {
          writer.AppendLineIf(ix > 0);

          AppendSummary(property.Description);
          writer.Append("public ").Append(GetClrTypeName(property)).Append(" ").Append(property.Name);
          if (property.ConstantValue != null)
          {
            writer.Append(" => ").Append(property.ConstantValue).AppendLine(";");
          }
          else
          {
            writer.Append(" { get; set; } = ").Append(property.Name).Append(";");
          }

          writer.AppendLine();
        }

        writer.Outdent().AppendLine("}");
      }
      else
      {
        writer.AppendLine(";");
      }

      writer.AppendLine();
      writer.AppendLine();
    }

    if (hasAnonymous)
    {
      writer.Outdent().AppendLine("#endregion").AppendLine();
    }

    var enumTypes = type.Properties.Values.Where(prop => prop.EnumValues != null).ToList();
    if (enumTypes.Count > 0)
    {
      writer.AppendLine().AppendLine("#region Enums").Indent().AppendLine();
      foreach (var enumType in enumTypes)
      {
        var ix = 0;
        writer.Append("public enum ").Append(GetEnumName(enumType)!).AppendLine().Append("{").Indent();
        foreach (var value in enumType.EnumValues!)
        {
          if (string.IsNullOrEmpty(value))
            continue;

          writer.AppendLine(ix++ > 0 ? "," : "");
          writer.Append(SchemaTypeParser.PascalCase(value));
        }

        writer.AppendLine().Outdent().AppendLine("}").AppendLine();
      }

      writer.Outdent().AppendLine("#endregion").AppendLine();
    }

    void AppendSummary(string? summary)
    {
      if (string.IsNullOrEmpty(summary))
        return;

      summary = Regex.Replace(
        HttpUtility.HtmlEncode(summary),
        @"\{\s*@link\s+(?<Type>[^\s}]+)\s*\}",
        match =>
        {
          var parts = match.Groups["Type"].Value.Split(".");
          var typeName = SchemaTypeParser.PascalCase(parts[0]);
          if (types.TryGetValue(typeName, out var type))
          {
            if (type.IsBaseInterface)
            {
              typeName = string.Concat("I", typeName);
            }
          }

          var rewritten = parts.Length > 1 ? $"{typeName}.{SchemaTypeParser.PascalCase(parts[1])}" : typeName;

          return $"<see cref=\"{rewritten}\"/>";
        }
      );
      writer.AppendLine("/// <summary>");

      foreach (var line in Regex.Split(summary, @"\\$|\r?\n")) // Also handle markdown line break (backslash at end of line).
      {
        writer.Append("/// ").AppendLine(line);
      }

      writer.AppendLine("/// </summary>");
    }

    await writeTypeCode(type, generatedCode.ToString());
  }
}
