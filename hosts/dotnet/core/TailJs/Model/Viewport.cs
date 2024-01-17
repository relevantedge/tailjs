using System;

namespace TailJs.Model;

public record Viewport(
  double X,
  double Y,
  double Width,
  double Height,
  double TotalWidth,
  double TotalHeight
) : Rectangle(
    X: X,
    Y: Y,
    Width: Width,
    Height: Height
  )
{
  public double TotalWidth { get; set; } = TotalWidth;
  
  public double TotalHeight { get; set; } = TotalHeight;
}


