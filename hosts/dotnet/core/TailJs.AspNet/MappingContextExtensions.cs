namespace TailJs.AspNet;

public static class MappingContextExtensions
{
  public static T? IfViewOrContent<T>(this MappingContext context, Func<MappingContext, T> result) =>
    context is ViewMappingContext or ContentMappingContext ? result(context) : default;

  public static T? IfViewOrComponent<T>(this MappingContext context, Func<MappingContext, T> result) =>
    context is ViewMappingContext or ComponentMappingContext ? result(context) : default;

  public static T? IfView<T>(this MappingContext context, Func<ViewMappingContext, T> result) =>
    context is ViewMappingContext viewMappingContext ? result(viewMappingContext) : default;

  public static T? IfContent<T>(this MappingContext context, Func<ContentMappingContext, T> result) =>
    context is ContentMappingContext contentContext ? result(contentContext) : default;

  public static T? IfComponent<T>(this MappingContext context, Func<ComponentMappingContext, T> result) =>
    context is ComponentMappingContext componentContext ? result(componentContext) : default;

  public static bool HasOwnModel(this MappingContext? context) =>
    context != null
    && (context is not ViewMappingContext viewContext || viewContext.Model != viewContext.Parent?.Model);
}
