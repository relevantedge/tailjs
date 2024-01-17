using System;

namespace TailJs.Model;

public record GeoEntity(
  string Name,
  long? Geonames = null,
  string? Iso = null,
  double? Confidence = null
)
{
  public string Name { get; set; } = Name;
  
  public long? Geonames { get; set; } = Geonames;
  
  public string? Iso { get; set; } = Iso;
  
  public double? Confidence { get; set; } = Confidence;
}


