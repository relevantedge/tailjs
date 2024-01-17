using System.Diagnostics;
using System.Text.RegularExpressions;

using Microsoft.AspNetCore.Mvc.Diagnostics;

using TailJs.Model;

namespace TailJs.AspNet;

public class RazorPageObserver : IObserver<KeyValuePair<string, object?>>, IDisposable
{
  private static readonly ObjectPool<DiagnosticListener> DiagnosticsListeners =
    new(i => new($"Razor page render listener #{i}"));

  private readonly IViewWriterAccessor _writerAccessor;
  private readonly ITrackerRenderingContext _renderContext;

  private readonly Stack<(TextWriter? Writer, IDataMarkupHeader? Header, MappedView View)> _scopes = new();

  private readonly ObjectLease<DiagnosticListener> _lease;
  private readonly IDisposable _subscription;

  public RazorPageObserver(IViewWriterAccessor writerAccessor, ITrackerRenderingContext renderContext)
  {
    _writerAccessor = writerAccessor;
    _renderContext = renderContext;
    _lease = DiagnosticsListeners.Rent();
    _subscription = _lease.Item.Subscribe(this);
  }

  public DiagnosticListener Listener => _lease.Item;

  #region IDisposable Members

  public void Dispose()
  {
    _lease.Dispose();
    _subscription.Dispose();
  }

  #endregion


  #region IObserver<KeyValuePair<string,object?>> Members

  public void OnCompleted() { }

  public void OnError(Exception error) { }

  public void OnNext(KeyValuePair<string, object?> value)
  {
    if (value is { Key: BeforeViewPageEventData.EventName, Value: BeforeViewPageEventData beforeEvent })
    {
      var model = beforeEvent.ViewContext.ViewData.Model;

      var mappedView = new MappedView(
        beforeEvent.Page,
        model,
        _scopes.TryPeek(out var parent) ? parent.View : null
      );

      var boundary = _renderContext.ItemData.MapView(mappedView) ?? new();

      var header = _renderContext.GetDataScopeHeader(boundary);

      _scopes.Push((_writerAccessor.CurrentWriter, header, mappedView));
      var viewWriter = _writerAccessor.CurrentWriter = beforeEvent.ViewContext.Writer;
      if (header != null)
      {
        viewWriter.Write(header.HeaderHtml);
      }
    }
    else if (value is { Key: AfterViewPageEventData.EventName, Value: AfterViewPageEventData afterEvent })
    {
      var (writer, header, _) = _scopes.Pop();

      if (header != null)
      {
        afterEvent.ViewContext.Writer.Write(header.FooterHtml);
      }
      _writerAccessor.CurrentWriter = writer;
    }
  }

  #endregion
}
