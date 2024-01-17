using System;

namespace TailJs.Model;

public record OrderLine(
  decimal? Price = null,
  string? Unit = null,
  string? Currency = null,
  ExternalReference? Variation = null,
  double? Stock = null,
  long? Units = null,
  ExternalReference? Item = null,
  List<string?>? Tags = null,
  string? LineId = null,
  decimal? Vat = null,
  decimal? Total = null
) : IOrderQuantity, ITagged
{
  /// <summary>
  /// The unit price.
  /// </summary>
  public decimal? Price { get; set; } = Price;
  
  /// <summary>
  /// The unit the item is sold by.
  /// </summary>
  public string? Unit { get; set; } = Unit;
  
  /// <summary>
  /// The currency of the price. This field does not have a default value; if unspecified it must be assumed from context.
  /// </summary>
  public string? Currency { get; set; } = Currency;
  
  /// <summary>
  /// The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple).
  /// </summary>
  public ExternalReference? Variation { get; set; } = Variation;
  
  /// <summary>
  /// The current number of units in stock.
  /// 
  /// Use fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many).
  /// </summary>
  public double? Stock { get; set; } = Stock;
  
  /// <summary>
  /// The number of units.
  /// 
  /// The default value is 1.
  /// </summary>
  public long? Units { get; set; } = Units;
  
  /// <summary>
  /// The item that relates to this quantity. If not explictly set it will get its value from the closest associated content in a  <see cref="IUserInteractionEvent"/>  context.
  /// </summary>
  public ExternalReference? Item { get; set; } = Item;
  
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
  /// An optional identifier that makes it possible to reference this order line directly.
  /// </summary>
  public string? LineId { get; set; } = LineId;
  
  /// <summary>
  /// The VAT included in the total.
  /// </summary>
  public decimal? Vat { get; set; } = Vat;
  
  /// <summary>
  /// The total for this order line including VAT
  /// </summary>
  public decimal? Total { get; set; } = Total;
}


