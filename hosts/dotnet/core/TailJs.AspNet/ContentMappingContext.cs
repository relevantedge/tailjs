namespace TailJs.AspNet;

public record ContentMappingContext(ElementBoundaryMapping? Current, IModelContext Mapper)
  : MappingContext(Current, Mapper);
