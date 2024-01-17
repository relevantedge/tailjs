using System;

namespace TailJs.Model;

/// <summary>
/// Represent a reference to externally defined data.
/// 
/// Have in mind that the reference does not need to point to an external system or database. It can just as well be a named reference to a React component, the value of a MV test variable or event just some hard-coded value.
/// 
/// The tail-f model generally prefers using external references rather than simple strings for most properties since that gives you the option to collect structured data that integrates well in, say, BI scenarios.
/// 
/// The tenent is that if you only use an URL from a web page, or the name of a campaign you will lose the ability to easily track these historically if/when they change. Even when correctly referencing a immutable ID you might still want to include the name to make it possible to add labels in your analytics reporting without integrating additional data sources. The names may then still be wrong after some time, but at least then you have the IDs data does not get lost, and you have a path for correcting it.
/// 
/// Again, if you only have some hard-coded value, you can just make an external reference and use its  <see cref="Id"/>  property for the value. Hopefully, you will find that a little bit annoying every time you do it and make you start thinking about that you might in fact reference some external information that has an immutable ID.
/// </summary>
public record ExternalReference(
  string Id,
  string? Version = null,
  string? Language = null,
  string? Source = null,
  string? ReferenceType = null,
  bool? IsExternal = null,
  string? Name = null,
  string? ItemType = null,
  string? Path = null
)
{
  /// <summary>
  /// The ID as defined by some external source, e.g. CMS.
  /// 
  /// The property is required but an empty string is permitted. The library itself uses the empty string to indicate an &quot;empty&quot; root component if a page has content that is not wrapped in a component.
  /// </summary>
  public string Id { get; set; } = Id;
  
  /// <summary>
  /// Optionally, the version of the item in case the external source supports versioning.
  /// </summary>
  public string? Version { get; set; } = Version;
  
  /// <summary>
  /// Optionally, the language of the item in case the external source supports localization.
  /// </summary>
  public string? Language { get; set; } = Language;
  
  /// <summary>
  /// Optionally, the ID of the external system referenced.
  /// </summary>
  public string? Source { get; set; } = Source;
  
  /// <summary>
  /// Optionally, how the item is referenced in case the external source supports multiple kinds of references, e.g. &quot;parent&quot; or &quot;pointer&quot;.
  /// </summary>
  public string? ReferenceType { get; set; } = ReferenceType;
  
  /// <summary>
  /// Flag to indicate that this data comes from an external system that you do not control.
  /// </summary>
  public bool? IsExternal { get; set; } = IsExternal;
  
  /// <summary>
  /// Optionally, the name of the item at the time an event was recorded. Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.
  /// </summary>
  public string? Name { get; set; } = Name;
  
  /// <summary>
  /// Optionally, the type of item referenced. In CMS context this corresponds to &quot;template&quot;. Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.
  /// </summary>
  public string? ItemType { get; set; } = ItemType;
  
  /// <summary>
  /// Optionally, the path of the item at the time the event was recorded. Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.
  /// </summary>
  public string? Path { get; set; } = Path;
}


