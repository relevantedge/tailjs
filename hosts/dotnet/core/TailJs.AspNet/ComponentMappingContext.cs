namespace TailJs.AspNet;

public record ComponentMappingContext(ElementBoundaryMapping? Current, IModelContext Mapper)
  : MappingContext(Current, Mapper);
