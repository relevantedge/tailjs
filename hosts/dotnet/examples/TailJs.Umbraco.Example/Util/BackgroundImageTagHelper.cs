using System.Web;

using Microsoft.AspNetCore.Razor.TagHelpers;

using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors.ValueConverters;

namespace TailJs.Umbraco.Example.Util;

[HtmlTargetElement(Attributes = "background")]
public class BackgroundImageTagHelper : TagHelper
{
  public MediaWithCrops? Background { get; set; }

  public override void Process(TagHelperContext context, TagHelperOutput output)
  {
    if (
      Background?.Value<ImageCropperValue>(Constants.Conventions.Media.File)
      is not { Src: { } src } cropperValue
    )
    {
      return;
    }

    var current = output.Attributes.FirstOrDefault(attribute => attribute.Name == "style");
    output.Attributes.SetAttribute(
      "style",
      $"background:url('{HttpUtility.HtmlEncode(src)}') no-repeat{
        (cropperValue.FocalPoint is { } focalPoint ? $" {focalPoint.Left:P2} {focalPoint.Top:P2}" : "")
      };background-size:cover;{current?.Value}"
    );
  }
}
