using System;

namespace TailJs.Model;

/// <summary>
/// Represents a position where the units are percentages relative to an element or page.
/// </summary>
public record ScreenPosition(
  double X,
  double Y,
  long? Xpx = null,
  long? Ypx = null,
  double? PageFolds = null
)
{
  public double X { get; set; } = X;
  
  public double Y { get; set; } = Y;
  
  public long? Xpx { get; set; } = Xpx;
  
  public long? Ypx { get; set; } = Ypx;
  
  /// <summary>
  /// The vertical position as a multiple of the page fold position (less than 1 means that the element was visible without scrolling).
  /// </summary>
  public double? PageFolds { get; set; } = PageFolds;
}


