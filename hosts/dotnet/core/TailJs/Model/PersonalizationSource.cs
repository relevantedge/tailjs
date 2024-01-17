using System;

namespace TailJs.Model;

/// <summary>
/// A specific aspect changed for a page or component for personalization as part of a  <see cref="PersonalizationVariant"/> .
/// </summary>
public record PersonalizationSource(
  string Id,
  string? Version = null,
  string? Language = null,
  string? Source = null,
  string? ReferenceType = null,
  bool? IsExternal = null,
  string? Name = null,
  string? ItemType = null,
  string? Path = null,
  string? RelatedVariable = null,
  string? PersonalizationType = null
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
  /// <summary>
  /// In case of a multi-variate test (or similar) that runs over multiple components and/or pages, this can be the ID of the specific variable that decided personalization for a specific component.
  /// </summary>
  public string? RelatedVariable { get; set; } = RelatedVariable;
  
  /// <summary>
  /// The kind of personalization that relates to this item.
  /// </summary>
  public string? PersonalizationType { get; set; } = PersonalizationType;
}


