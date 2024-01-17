namespace TailJs.AspNet;

public abstract record MappingContext(ElementBoundaryMapping? Current, IModelContext Mapper);
