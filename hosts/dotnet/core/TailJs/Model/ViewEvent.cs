using System;

namespace TailJs.Model;

public record ViewEvent(
  string Id,
  string Href,
  List<string?>? Tags = null,
  string? Schema = null,
  string? ClientId = null,
  long? Retry = null,
  string? Related = null,
  Session? Session = null,
  string? View = null,
  long? Timestamp = null,
  View? Definition = null,
  string? Tab = null,
  string? Hash = null,
  string? Path = null,
  ViewEventUtm? Utm = null,
  Dictionary<string, List<string?>?>? QueryString = null,
  Domain? Domain = null,
  bool? LandingPage = null,
  bool? FirstTab = null,
  long? TabIndex = null,
  long? Redirects = null,
  ViewEventNavigationType? NavigationType = null,
  ViewEventMode? Mode = null,
  ViewEventExternalReferrer? ExternalReferrer = null,
  Size? Viewport = null,
  string? ViewType = null
) : ITrackedEvent
{
  /// <summary>
  /// The type name of the event.
  /// 
  /// This MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered.
  /// </summary>
  public string Type => "VIEW";
  
  
  /// <summary>
  /// The ID of the view event that is referenced by  <see cref="ViewContext"/> .
  /// </summary>
  public string Id { get; set; } = Id;
  
  /// <summary>
  /// The fully qualified URL as shown in the address line of the browser excluding the domain.
  /// </summary>
  public string Href { get; set; } = Href;
  
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
  
  /// <summary>
  /// The primary content used to generate the view including the personalization that led to the decision, if any.
  /// </summary>
  public View? Definition { get; set; } = Definition;
  
  /// <summary>
  /// The tab where the view was shown.
  /// </summary>
  public string? Tab { get; set; } = Tab;
  
  /// <summary>
  /// The hash part of the URL (/about-us#address).
  /// </summary>
  public string? Hash { get; set; } = Hash;
  
  /// <summary>
  /// The path portion of the URL.
  /// </summary>
  public string? Path { get; set; } = Path;
  
  /// <summary>
  /// Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters].
  /// </summary>
  public ViewEventUtm? Utm { get; set; } = Utm;
  
  /// <summary>
  /// The query string parameters in the URL, e.g. utm_campaign. Each parameter can have multiple values, for example If the parameter is specified more than once. If the parameter is only specified once pipes, semicolons and commas are assumed to separate values (in that order). A parameter without a value will get recorded as an empty string.
  /// </summary>
  public Dictionary<string, List<string?>?>? QueryString { get; set; } = QueryString;
  
  /// <summary>
  /// The domain part of the href, if any.
  /// </summary>
  public Domain? Domain { get; set; } = Domain;
  
  /// <summary>
  /// Indicates that this was the first view in the first tab the user opened. Note that this is NOT tied to the session. If a user closes all tabs and windows for the site and then later navigates back to the site in the same session this flag will be set again.
  /// 
  /// The default value is false.
  /// </summary>
  public bool? LandingPage { get; set; } = LandingPage;
  
  /// <summary>
  /// Indicates that no other tabs were open when the view happened. This flag allows a backend to extend the definition of a session that can last indefinitely but still restart after inactivity. By measuring the time between a view with this flag and the previous event from the same device, it is possible to see for how long the device has been away from the site.
  /// 
  /// The default value is false.
  /// </summary>
  public bool? FirstTab { get; set; } = FirstTab;
  
  /// <summary>
  /// The 1-indexed view number in the current tab. This is kept as a convenience, yet technically redundant since it follows from timestamps and context.
  /// 
  /// The default value is 1.
  /// </summary>
  public long? TabIndex { get; set; } = TabIndex;
  
  /// <summary>
  /// Number of redirects that happened during navigation to this view.
  /// </summary>
  public long? Redirects { get; set; } = Redirects;
  
  /// <summary>
  /// Navigation type.
  /// </summary>
  public ViewEventNavigationType? NavigationType { get; set; } = NavigationType;
  
  /// <summary>
  /// Indicates whether the event was manually triggered through a tracker command, or happened automatically by the tracker&#39;s ability to infer navigation.
  /// 
  /// The default value is automatic.
  /// </summary>
  public ViewEventMode? Mode { get; set; } = Mode;
  
  /// <summary>
  /// External referrer. Internal referrers follows from the event&#39;s  {@link  TrackedEvent [&quot;relatedView&quot;] }  field.
  /// </summary>
  public ViewEventExternalReferrer? ExternalReferrer { get; set; } = ExternalReferrer;
  
  /// <summary>
  /// The size of the user&#39;s view port (e.g. browser window) when the page was opened.
  /// </summary>
  public Size? Viewport { get; set; } = Viewport;
  
  /// <summary>
  /// The type of view, e.g. &quot;page&quot; or &quot;screen&quot;.
  /// 
  /// The default value is page.
  /// </summary>
  public string? ViewType { get; set; } = ViewType;
}


#region Anonymous types

  /// <summary>
  /// Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters].
  /// </summary>
  public record ViewEventUtm(
    string? Source = null,
    string? Medium = null,
    string? Campaign = null,
    string? Term = null,
    string? Content = null
  )
  {
    public string? Source { get; set; } = Source;
    
    public string? Medium { get; set; } = Medium;
    
    public string? Campaign { get; set; } = Campaign;
    
    public string? Term { get; set; } = Term;
    
    public string? Content { get; set; } = Content;
  }
  
  
  /// <summary>
  /// External referrer. Internal referrers follows from the event&#39;s  {@link  TrackedEvent [&quot;relatedView&quot;] }  field.
  /// </summary>
  public record ViewEventExternalReferrer(
    string? Href = null,
    Domain? Domain = null
  )
  {
    public string? Href { get; set; } = Href;
    
    public Domain? Domain { get; set; } = Domain;
  }
  
  
#endregion


#region Enums
  
  public enum ViewEventNavigationType
  {
    Navigate,
    BackForward,
    Prerender,
    Reload
  }
  
  public enum ViewEventMode
  {
    Manual,
    Automatic
  }
  
#endregion

