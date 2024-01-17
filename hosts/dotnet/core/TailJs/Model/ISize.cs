using System;

namespace TailJs.Model;

public interface ISize
{
  double Width { get; }
  
  double Height { get; }
}

public record Size(
  double Width,
  double Height
)
{
  public double Width { get; set; } = Width;
  
  public double Height { get; set; } = Height;
}


