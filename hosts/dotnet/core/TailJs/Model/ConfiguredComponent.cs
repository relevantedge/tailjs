using System;

namespace TailJs.Model;

public record ConfiguredComponent(
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
  TrackingSettings? Track = null
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
  /// Settings for how the component will be tracked.
  /// 
  /// These settings are not tracked, that is, this property is stripped from the data sent to the server.
  /// </summary>
  public TrackingSettings? Track { get; set; } = Track;
}


