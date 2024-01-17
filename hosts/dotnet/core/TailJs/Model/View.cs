using System;

namespace TailJs.Model;

public record View(
  string Id,
  string? Version = null,
  string? Language = null,
  string? Source = null,
  string? ReferenceType = null,
  bool? IsExternal = null,
  string? Name = null,
  string? ItemType = null,
  string? Path = null,
  List<string?>? Tags = null,
  CommerceData? Commerce = null,
  List<Personalization?>? Personalization = null,
  bool? Preview = null
) : Content(
    Id: Id,
    Version: Version,
    Language: Language,
    Source: Source,
    ReferenceType: ReferenceType,
    IsExternal: IsExternal,
    Name: Name,
    ItemType: ItemType,
    Path: Path,
    Tags: Tags,
    Commerce: Commerce
  ), IPersonalizable
{
  public List<Personalization?>? Personalization { get; set; } = Personalization;
  
  /// <summary>
  /// The page was shown in preview/staging mode.
  /// </summary>
  public bool? Preview { get; set; } = Preview;
}


