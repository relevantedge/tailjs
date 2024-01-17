using System.Diagnostics;
using System.Text.Encodings.Web;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.Extensions.DependencyInjection;

using TailJs.AspNet.Helpers;
using TailJs.IO;

namespace TailJs.AspNet;

public class ViewEngineDecorator : ICompositeViewEngine
{
  private readonly ICompositeViewEngine _inner;
  private readonly IHttpContextAccessor _httpContextAccessor;
  private readonly IRazorViewEngine _viewEngine;
  private readonly IRazorPageActivator _pageActivator;

  public ViewEngineDecorator(
    ICompositeViewEngine inner,
    IHttpContextAccessor httpContextAccessor,
    IRazorViewEngine viewEngine,
    IRazorPageActivator pageActivator
  )
  {
    _inner = inner;
    _httpContextAccessor = httpContextAccessor;
    _viewEngine = viewEngine;
    _pageActivator = pageActivator;

    TrackerHtmlExtensions.Initialize(httpContextAccessor);
  }

  private ViewEngineResult DecorateResult(ViewEngineResult result)
  {
    if (
      !result.Success
      || _httpContextAccessor.HttpContext is not { RequestServices: var services }
      || result.View is not RazorView razorView
      || services.GetService<DataMarkupWriter>() is not { } writer
    )
    {
      return result;
    }

    return ViewEngineResult.Found(
      result.ViewName,
      new DecoratingRazorView(
        writer,
        _viewEngine,
        _pageActivator,
        razorView.ViewStartPages,
        razorView.RazorPage,
        HtmlEncoder.Default,
        services.GetService<RazorPageObserver>()?.Listener
          ?? services.GetRequiredService<DiagnosticListener>()
      )
    );
  }

  #region ICompositeViewEngine Members

  public IReadOnlyList<IViewEngine> ViewEngines => _inner.ViewEngines;

  public ViewEngineResult FindView(ActionContext context, string viewName, bool isMainPage) =>
    DecorateResult(_inner.FindView(context, viewName, isMainPage));

  public ViewEngineResult GetView(string? executingFilePath, string viewPath, bool isMainPage) =>
    DecorateResult(_inner.GetView(executingFilePath, viewPath, isMainPage));

  #endregion


  private class DecoratingRazorView : RazorView
  {
    private readonly DataMarkupWriter _writer;

    public DecoratingRazorView(
      DataMarkupWriter writer,
      IRazorViewEngine viewEngine,
      IRazorPageActivator pageActivator,
      IReadOnlyList<IRazorPage> viewStartPages,
      IRazorPage razorPage,
      HtmlEncoder htmlEncoder,
      DiagnosticListener diagnosticListener
    ) : base(viewEngine, pageActivator, viewStartPages, razorPage, htmlEncoder, diagnosticListener)
    {
      _writer = writer;
    }

    public override async Task RenderAsync(ViewContext context)
    {
      if (_writer.TargetWriterCount == 0)
      {
        // We only want the writer to parse the output from the root view, so ignore nested views.
        // Internally the rendered HTML fragments may be stitched together in all kinds of ways (e.g. inserted into layout),
        // and that will confuse the writer's DOM parse state.
        context.Writer = _writer.PushWriter(context.Writer);
        try
        {
          await base.RenderAsync(context);
          await _writer.EndWriteAsync();
        }
        finally
        {
          context.Writer = _writer.PopWriter();
        }
      }
      else
      {
        await base.RenderAsync(context);
      }
    }
  }
}
