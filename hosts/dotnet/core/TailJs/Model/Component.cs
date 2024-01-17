using System;

namespace TailJs.Model;

public record Component(
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
  bool? Inferred = null
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
  ), IPersonalizable, ITagged
{
  public List<Personalization?>? Personalization { get; set; } = Personalization;
  
  /// <summary>
  /// Tags in tail-f are a flexible form of key/value pairs that can be used to categorize events, track component parameters and add contextual information to content data organized in a taxnonmy specific to your business domain.
  /// 
  /// Examples of tags are `promotion, color=black`, `conversion:high-value`, `rendering:component:theme=dark`, `ad-campaign=43899` and `ext1:video:play`
  /// 
  /// As in the examples above, tags can optionally have a value indicated by an equals sign (`=`), and the names can be organized in taxonomies with each rank separated by colon (`:`). If there are more than one tag they are separated by comma (`,`).
  /// 
  /// The following rules apply:
  /// - There should not be quotes around tag values. If there are they will get interpreted as part of the value.
  /// - Tag names will get &quot;cleaned&quot; while they are tracked, and all letters are converted to lowercase and other characters than numbers,  `.`, `-` and `_` are replaced with `_`.
  /// - Tag values can be mostly anything, but you should keep them short and prefer referencing things by their external ID instead of their names.
  /// - If you need the `,` literal as part of a tag value it can be escaped by adding a backslash in front of it (`\,`), however using commas or similar characters to store a list of values in the same tag is strongly discouraged as each value should rather have its own tag.
  /// 
  /// BAD: `selected=1\,2\,3`, `selected=1|2|3` GOOD: `selected=1, selected=2, selected=3`
  /// 
  /// BAD: `event=My social gathering in July,source=eventbrite` LESS BAD: `event:eventbrite=8487912` GOOD: Use an  <see cref="ExternalReference"/> .
  /// 
  /// BAD: `campaign:promo=1, campaign:length:4` GOOD: `campaign:promo, campaign:length=4`
  /// 
  /// Tags can be either be added directly to content and component definitions, or added to HTML tags with the `track-tags` attribute or `--track-tags` CSS property. In the latter case all tags from the HTML elements that contain a component or surround content are added to tracking when the user clicks around.
  /// 
  /// This allows some tags to be managed via e.g. CMS and follow thec content around wherever it is used on the website, and other tags to be included by the logic that puts the bits and pieces together to the final webpage the user sees.
  /// 
  /// This unified approach gives a clear way to store all domain-specific data in a way that goes very well with analytics. If the shape of the data you want to store is too complex to easily fit into tags, you can instead extend the tracker&#39;s event schema.
  /// </summary>
  public List<string?>? Tags { get; set; } = Tags;
  
  /// <summary>
  /// An additional type name that defines the component as represented in code. For example, the name of a (p)react component or ASP.NET partial.
  /// </summary>
  public string? TypeName { get; set; } = TypeName;
  
  /// <summary>
  /// Optional references to the content that was used to render the component.
  /// </summary>
  public ExternalReference? DataSource { get; set; } = DataSource;
  
  /// <summary>
  /// An optional, unique identifier for the specific instance of the component with its parameters and current position in the rendered element tree.
  /// </summary>
  public string? InstanceId { get; set; } = InstanceId;
  
  /// <summary>
  /// If the same component type is used multiple times on the same page this number indicates which one it is. (As defined in the page&#39;s markup, typically this amounts to left-to-right/top-to-bottom).
  /// </summary>
  public long? InstanceNumber { get; set; } = InstanceNumber;
  
  /// <summary>
  /// A flag indicating whether the component was automatically inferred from context (e.g. by traversing the tree of React components).
  /// 
  /// The default value is false.
  /// </summary>
  public bool? Inferred { get; set; } = Inferred;
}


