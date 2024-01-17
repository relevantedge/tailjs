using System;

namespace TailJs.Model;

/// <summary>
/// A reference to a variable and its value in personalization.
/// </summary>
public record PersonalizationVariable(
  string Id,
  string Value,
  string? Version = null,
  string? Language = null,
  string? Source = null,
  string? ReferenceType = null,
  bool? IsExternal = null,
  string? Name = null,
  string? ItemType = null,
  string? Path = null
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
}


