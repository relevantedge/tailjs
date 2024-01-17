using System;

namespace TailJs.Model;

/// <summary>
/// Represents a position where the units are (CSS pixels)[#DevicePixelRatio].
/// </summary>
public record Position(
  double X,
  double Y
)
{
  public double X { get; set; } = X;
  
  public double Y { get; set; } = Y;
}


