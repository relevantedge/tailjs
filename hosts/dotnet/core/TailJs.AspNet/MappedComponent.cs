using TailJs.Model;

namespace TailJs.AspNet;

public record MappedComponent(Component Component, bool? Include = null);
