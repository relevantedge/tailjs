using System.Text.RegularExpressions;

using TailJs.Model;

namespace TailJs.AspNet;

public class RazorComponentMapper : IModelTypeMapper
{
  public int Priority => -1000;

  public bool Match(Type modelType) => true;

  public ElementBoundaryMapping MapModel(
    object? model,
    MappingContext context,
    Func<ElementBoundaryMapping> next
  )
  {
    var mapped = next();
    if (context is ViewMappingContext viewContext && mapped == null)
    {
      return new(
        Component: new ConfiguredComponent(
          Id: Regex.Replace(
            viewContext.View.Path,
            @"^(?:\/?Views\/)?(.*?)(?:\.cshtml)?$",
            "$1",
            RegexOptions.IgnoreCase
          ),
          TypeName: "cshtml",
          Track: new() { Secondary = true }
        )
      );
    }

    return mapped;
  }
}
