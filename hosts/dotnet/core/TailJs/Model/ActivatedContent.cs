using System;

namespace TailJs.Model;

/// <summary>
/// The content definition related to a user activation.
/// </summary>
public record ActivatedContent(
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
  Rectangle? Rect = null
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
  )
{
  /// <summary>
  /// The current size and position of the element representing the content relative to the document top (not viewport).
  /// </summary>
  public Rectangle? Rect { get; set; } = Rect;
}


