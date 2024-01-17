using Microsoft.AspNetCore.Razor.TagHelpers;

using TailJs.Model;

namespace TailJs.AspNet.Helpers;

[HtmlTargetElement("track-content")]
public class DataScopeContentTagHelper : DataScopeTagHelper
{
  public DataScopeContentTagHelper(ITrackerRenderingContext? renderingContext = null) : base(renderingContext)
  { }

  public object? Data { get; set; }

  public string? Id { get; set; }

  public string? Name { get; set; }

  public string? Type { get; set; }

  public string? Version { get; set; }

  public string? Language { get; set; }

  public string? Source { get; set; }

  protected override ElementBoundaryMapping? GetMapping() =>
    MapContentData(Data, Id, Name, Type, Version, Language, Source);

  public override void Process(TagHelperContext context, TagHelperOutput output)
  {
    output.TagName = null;
    base.Process(context, output);
  }
}
