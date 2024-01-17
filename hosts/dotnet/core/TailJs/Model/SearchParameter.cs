using System;

namespace TailJs.Model;

public record SearchParameter(
  string Id,
  string Value,
  string? Version = null,
  string? Language = null,
  string? Source = null,
  string? ReferenceType = null,
  bool? IsExternal = null,
  string? Name = null,
  string? ItemType = null,
  string? Path = null,
  SearchParameterComparison? Comparison = null
) : ExternalReference(
    Id: Id,
    Version: Version,
    Language: Language,
    Source: Source,
    ReferenceType: ReferenceType,
    IsExternal: IsExternal,
    Name: Name,
    ItemType: ItemType,
    Path: Path
  )
{
  public string Value { get; set; } = Value;
  
  public SearchParameterComparison? Comparison { get; set; } = Comparison;
}



#region Enums
  
  public enum SearchParameterComparison
  {
    Lt,
    Eq,
    Gt
  }
  
#endregion

