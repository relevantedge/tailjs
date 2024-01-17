using Microsoft.AspNetCore.Mvc.Razor;

namespace TailJs.AspNet;

public record MappedView(IRazorPage View, object? Model, MappedView? Parent);
