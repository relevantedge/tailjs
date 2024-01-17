using System;

namespace TailJs.Model;

/// <summary>
/// A reference to the data/content item related to a variant in personalization.
/// </summary>
public record PersonalizationVariant(
  string Id,
  string? Version = null,
  string? Language = null,
  string? Source = null,
  string? ReferenceType = null,
  bool? IsExternal = null,
  string? Name = null,
  string? ItemType = null,
  string? Path = null,
  List<PersonalizationSource?>? Sources = null,
  bool? Default = null,
  bool? Eligible = null,
  bool? Selected = null
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
  /// The aspects of the component or page the variant changed. There can mutilple sources, e.g. a variant may both change the size of a component and change the content at the same time.
  /// </summary>
  public List<PersonalizationSource?>? Sources { get; set; } = Sources;
  
  /// <summary>
  /// If the reference is the default variant.
  /// 
  /// The default value is false.
  /// </summary>
  public bool? Default { get; set; } = Default;
  
  /// <summary>
  /// If the variant could have been picked.
  /// </summary>
  public bool? Eligible { get; set; } = Eligible;
  
  /// <summary>
  /// If the variant was chosen.
  /// </summary>
  public bool? Selected { get; set; } = Selected;
}


