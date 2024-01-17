using Microsoft.AspNetCore.Razor.TagHelpers;

using TailJs.Model;

using Component = System.ComponentModel.Component;

namespace TailJs.AspNet.Helpers;

[HtmlTargetElement("track-component")]
public class DataScopeComponentTagHelper : DataScopeTagHelper
{
  public DataScopeComponentTagHelper(ITrackerRenderingContext? renderingContext = null)
    : base(renderingContext) { }

  public object? Data { get; set; }

  public string? Id { get; set; }

  public string? Name { get; set; }

  public string? TypeName { get; set; }

  public string? Language { get; set; }

  public ExternalReference? Source { get; set; }

  public string? SourceId { get; set; }

  public bool? Promote { get; set; }

  protected override ElementBoundaryMapping? GetMapping() =>
    MapComponentData(Data, Id, Name, TypeName, Language, Source, SourceId, Promote);

  public override void Process(TagHelperContext context, TagHelperOutput output)
  {
    output.TagName = null;
    base.Process(context, output);
  }
}
