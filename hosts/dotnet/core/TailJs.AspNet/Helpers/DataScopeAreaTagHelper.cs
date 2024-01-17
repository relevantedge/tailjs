using Microsoft.AspNetCore.Razor.TagHelpers;

namespace TailJs.AspNet.Helpers;

[HtmlTargetElement("track-area")]
public class DataScopeAreaTagHelper : DataScopeTagHelper
{
  public string? Id { get; set; }

  public DataScopeAreaTagHelper(ITrackerRenderingContext? context = null) : base(context) { }

  protected override ElementBoundaryMapping GetMapping() =>
    new(Area: Id ?? throw new InvalidOperationException("id is required."));
}
