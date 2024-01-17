using System;

namespace TailJs.Model;

/// <summary>
/// The choices made by some logic to show different content to different users depending on some traits either to help them or to make them buy more.
/// </summary>
public record Personalization(
  List<string?>? Tags = null,
  ExternalReference? Source = null,
  List<PersonalizationVariable?>? Variables = null,
  List<PersonalizationVariant?>? Variants = null
) : ITagged
{
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
  /// The source and definition for the personalization. This could be a named rule set, a test definition or a specific configuration of an algorithm.
  /// 
  /// If you are using multiple services/system for personalization you can add this to  <see cref="ExternalReference.Source"/> .
  /// 
  /// If more than one component was changed by the same personalization logic they will share this source, but may have different variables.
  /// 
  /// For example, the personalization in each component may correspond to different variables in a multivariate test. In that case the components will share the  <see cref="Personalization.Source"/>  corresponding to the test, but have different  <see cref="Personalization.Variable"/> s.
  /// </summary>
  public ExternalReference? Source { get; set; } = Source;
  
  /// <summary>
  /// Typically used for the test variables in a A/B/MV test, but can also be used for significant weights/parameters in more complex algorithms.
  /// </summary>
  public List<PersonalizationVariable?>? Variables { get; set; } = Variables;
  
  /// <summary>
  /// The set of choices that were possible at the time given the user. Even though implied, this should include the choice made so the data does not look inconsistent.
  /// 
  /// To represent the default valuesvfor the sources that can be personalized, include the default variant and assign the default settings to it as sources.
  /// </summary>
  public List<PersonalizationVariant?>? Variants { get; set; } = Variants;
}


