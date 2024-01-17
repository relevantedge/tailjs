using System;

namespace TailJs.Model;

public record Rectangle(
  double X,
  double Y,
  double Width,
  double Height
) : Position(
    X: X,
    Y: Y
  ), ISize
{
  public double Width { get; set; } = Width;
  
  public double Height { get; set; } = Height;
}


