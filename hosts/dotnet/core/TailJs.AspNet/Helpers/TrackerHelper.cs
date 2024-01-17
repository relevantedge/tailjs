using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Razor;

namespace TailJs.AspNet.Helpers;

public class TrackerHelper
{
  public TrackerHelper(ITrackerRenderingContext context)
  {
    Context = context;
  }

  public ITrackerRenderingContext? Context { get; }

  public TimeSpan Elapsed => TrackerMiddleware.Elapsed;

  public long RequestCount => TrackerMiddleware.RequestCount;

  public string? Variable(string name) => Context?.Tracker?.Variables.GetString(name) ?? null;

  public T? Variable<T>(string name) =>
    Context?.Tracker?.Variables is { } variables
      ? variables.TryGetValue<T>(name, out var value)
        ? value!
        : default
      : default;

  public IHtmlContent Variable<T>(string name, Func<T, HelperResult> render)
  {
    if (Context?.Tracker?.Variables is { } variables && variables.TryGetValue<T>(name, out var value))
    {
      return render(value);
    }
    return HtmlString.Empty;
  }

  public IHtmlContent Component<T>(T component, Func<T, IHtmlContent> render) =>
    Render(component, component, null, render);

  public IHtmlContent Content<T>(T content, Func<T, IHtmlContent> render) =>
    Render(content, null, content, render);

  public IHtmlContent ComponentWithContent<TComponent, TContent>(
    TComponent component,
    TContent content,
    Func<TContent, IHtmlContent> render
  ) => Render(content, component, content, render);

  private IHtmlContent Render<T>(
    T item,
    object? componentData,
    object? contentData,
    Func<T, IHtmlContent> render
  ) =>
    new HelperResult(async writer =>
    {
      var header = Context?.GetDataScopeHeader(Context.ItemData.MapModels(contentData, componentData, null));
      if (header != null)
      {
        await writer.WriteAsync(header.HeaderHtml);
      }

      await render(item).Render(writer);

      if (header != null)
      {
        await writer.WriteAsync(header.FooterHtml);
      }
    });
}
