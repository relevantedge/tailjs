using System;

namespace TailJs.Model;

public record ViewEndedEvent(
  List<string?>? Tags = null,
  string? Schema = null,
  string? Id = null,
  string? ClientId = null,
  long? Retry = null,
  string? Related = null,
  Session? Session = null,
  string? View = null,
  long? Timestamp = null,
  ViewTimingEventTiming? Timing = null,
  bool? Bounce = null
) : ITrackedEvent, IViewTimingEvent
{
  /// <summary>
  /// The type name of the event.
  /// 
  /// This MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered.
  /// </summary>
  public string Type => "VIEW_ENDED";
  
  
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
  /// The ID of the schema the event comes from. It is suggested that the schema ID ends with a hash followed by a SemVer version number. (e.g. urn:tail-f#0.9.0)
  /// </summary>
  public string? Schema { get; set; } = Schema;
  
  /// <summary>
  /// This may be assigned or transformed by backends if needed. It is client-assigned for  <see cref="ViewEvent"/> s
  /// </summary>
  public string? Id { get; set; } = Id;
  
  /// <summary>
  /// This is set by the client and can be used to dedupplicate events sent multiple times if the endpoint timed out.
  /// </summary>
  public string? ClientId { get; set; } = ClientId;
  
  /// <summary>
  /// The number of times the client tried to sent the event if the endpoint timed out
  /// 
  /// The default value is 0.
  /// </summary>
  public long? Retry { get; set; } = Retry;
  
  /// <summary>
  /// The event that caused this event to be triggered or got triggered in the same context. For example a  <see cref="NavigationEvent"/>  may trigger a  <see cref="ViewEvent"/> , or a  <see cref="CartUpdatedEvent"/>  my be triggered with a  <see cref="ComponentClickEvent"/> .
  /// </summary>
  public string? Related { get; set; } = Related;
  
  /// <summary>
  /// The session associated with the event.
  /// </summary>
  public Session? Session { get; set; } = Session;
  
  /// <summary>
  /// When applicable, the view where the event happened (related by  <see cref="ViewEvent"/> ).
  /// </summary>
  public string? View { get; set; } = View;
  
  /// <summary>
  /// This timestamp will always have a value before it reaches a backend. If specified, it must be a negative number when sent from the client (difference between when the event was generated and when is was posted in milliseconds).
  /// 
  /// This is a Unix timestamp (milliseconds).
  /// 
  /// The default value is now.
  /// </summary>
  public long? Timestamp { get; set; } = Timestamp;
  
  public ViewTimingEventTiming? Timing { get; set; } = Timing;
  
  public bool? Bounce { get; set; } = Bounce;
}


