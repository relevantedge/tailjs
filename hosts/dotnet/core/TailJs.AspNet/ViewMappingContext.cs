using Microsoft.AspNetCore.Mvc.Razor;

namespace TailJs.AspNet;

public record ViewMappingContext(
  IRazorPage View,
  object? Model,
  MappedView? Parent,
  ElementBoundaryMapping? Current,
  IModelContext Mapper
) : MappingContext(Current, Mapper);
