using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace TailJs.Umbraco.Example.Util;

public enum BlockTheme
{
  Default,
  Dark,
  Light,
  White
}

public record BlockState
{
  public BlockState? Parent { get; init; }

  public int Depth { get; init; }

  public BlockTheme Theme { get; init; } = BlockTheme.Default;

  public bool FullWidth { get; init; }

  public IPublishedElement? Content { get; init; }
}
