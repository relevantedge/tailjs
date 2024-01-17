using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Web.Common.PublishedModels;

namespace TailJs.Umbraco.Example.Util;

public static class Helpers
{
  private const string BlockDataKey = "$BlockData";

  public static string GetComponentClassName(this BlockState state) =>
    string.Concat(
      $"gc gc-{state.Content?.ContentType.Alias} gc-d-{state.Depth}",
      state.Content is IGridAppearance component
        ? $" {(component.FullWidth ? "gc-full" : "")} gc-theme-{(string.IsNullOrEmpty(component.Theme) ? "default" : component.Theme)}"
        : ""
    );

  public static BlockState UpdateBlockState(this ViewDataDictionary viewData, IPublishedElement? content)
  {
    var currentState = new BlockState
    {
      Theme = (content as ContentBlock)?.Theme switch
      {
        "light" => BlockTheme.Light,
        "light-text" => BlockTheme.White,
        "dark" => BlockTheme.Dark,
        _ => BlockTheme.Default
      },
      FullWidth = (content as IGridAppearance)?.FullWidth == true,
      Content = content
    };
    if (viewData.TryGetValue(BlockDataKey, out var parentValue) && parentValue is BlockState { } parent)
    {
      currentState = currentState with
      {
        Depth = parent.Depth + 1,
        Parent = parent,
        Theme =
          currentState.Theme == BlockTheme.Default && parent.Theme != BlockTheme.Default
            ? parent.Theme
            : currentState.Theme,
        FullWidth = false
      };
    }

    viewData[BlockDataKey] = currentState;
    return currentState;
  }

  public static string? AsNonNullOrEmpty(this string? s) => string.IsNullOrEmpty(s?.Trim()) ? null : s;

  /// <summary>
  /// Concatenates the non-empty values are with a space.
  ///
  /// This method is particularly useful for long attribute values, e.g. conditionally added CSS classes, since a code formatter will keep line breaks for parameters inside method call,
  ///   but less likely within an attribute value without whitespace printed to the final output.
  /// </summary>
  public static IHtmlContent Join(this IHtmlHelper helper, params string?[] classNames) =>
    new HtmlString(string.Join(" ", classNames.Where(name => !string.IsNullOrEmpty(name))));
}
