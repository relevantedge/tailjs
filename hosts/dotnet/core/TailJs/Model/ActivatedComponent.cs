using System;

namespace TailJs.Model;

/// <summary>
/// The component definition related to a user activation.
/// </summary>
public record ActivatedComponent(
  string Id,
  string? Version = null,
  string? Language = null,
  string? Source = null,
  string? ReferenceType = null,
  bool? IsExternal = null,
  string? Name = null,
  string? ItemType = null,
  string? Path = null,
  List<Personalization?>? Personalization = null,
  List<string?>? Tags = null,
  string? TypeName = null,
  ExternalReference? DataSource = null,
  string? InstanceId = null,
  long? InstanceNumber = null,
  bool? Inferred = null,
  List<ActivatedContent?>? Content = null,
  Rectangle? Rect = null,
  string? Area = null
) : Component(
    Id: Id,
    Version: Version,
    Language: Language,
    Source: Source,
    ReferenceType: ReferenceType,
    IsExternal: IsExternal,
    Name: Name,
    ItemType: ItemType,
    Path: Path,
    Personalization: Personalization,
    Tags: Tags,
    TypeName: TypeName,
    DataSource: DataSource,
    InstanceId: InstanceId,
    InstanceNumber: InstanceNumber,
    Inferred: Inferred
  )
{
  /// <summary>
  /// The activated content in the component.
  /// </summary>
  public List<ActivatedContent?>? Content { get; set; } = Content;
  
  /// <summary>
  /// The size and position of the component when it was activated relative to the document top (not viewport).
  /// </summary>
  public Rectangle? Rect { get; set; } = Rect;
  
  /// <summary>
  /// An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.
  /// </summary>
  public string? Area { get; set; } = Area;
}


