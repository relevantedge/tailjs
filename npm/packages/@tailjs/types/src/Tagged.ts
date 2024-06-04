import type { Tag, ExternalReference } from ".";

/**
 * Types extending this interface allow custom values that are not explicitly defined in their schema.
 *
 * See {@link tags} for details.
 *
 */
export interface Tagged {
  /**
   * Tags in tail.js are a flexible form of key/value pairs that can be used to categorize events, track component parameters
   * and add contextual information to content data organized in a taxonomy specific to your business domain.
   *
   * Examples of tags are `promotion, color=black`, `rendering:component:theme=dark`, `ad-campaign=43899`,
   *  `ext1:video:play` and `area=investors+9, area=consumers+2`
   *
   * As in the examples above, tags can optionally have a value indicated by an equals sign (`=`), and the labels can be organized in taxonomies with each rank/taxon separated by a colon (`:`).
   *
   * It is possible to specify "how much" a tag applies to something via a _tag score_.
   * A common use case is to get a straight-forward way categorize sessions based on the users interests. For example, if a user
   * mostly clicks on CTAs and reads content with tags like `audience=investors+8,audience=consumers+1` the score for the "investors" audience will ultimately
   * be higher than the score for "consumers".
   *
   * Tags are separated by comma (`,`).
   *
   * The following rules apply:
   * - There should not be quotes around tag values. If there are they will get interpreted as part of the value.
   * - Tag names will get "cleaned" while they are tracked, and all letters are converted to lowercase and other characters than numbers,  `.`, `-` and `_` are replaced with `_`.
   * - Tag values can be mostly anything, but you should keep them short and prefer referencing things by their external ID instead of their names.
   * - If you need the `,` literal as part of a tag value it can be escaped by adding a backslash in front of it (`\,`), however using commas or similar characters
   *   to store a list of values in the same tag is discouraged as each value should rather have its own tag.
   *
   * BAD: `selected=1\,2\,3`, `selected=1|2|3`
   * GOOD: `selected=1, selected=2, selected=3`
   *
   * BAD: `event=My social gathering in July,source=eventbrite`
   * GOOD: `event:eventbrite:id=8487912`
   *
   * BAD: `campaign:promo=true, utm_campaign:fb_aug4_2023`
   * GOOD: `campaign:promo, utm:campaign=fb_aug4_2023`
   *
   * Tags can either be added directly to content and component definitions when events are tracked,
   * or added to the HTML elements that contain the components and content.
   *
   * Tags are associated with HTML elements either via the `track-tags` attribute,
   * or the  `--track-tags` CSS variable in a selector that matches them, and these tags will be added to all
   * content and components they contain including nested HTML elements.
   *
   * Since stylesheets can easily be injected to a page via an external tag manager, this makes an easy way
   * to manage the (tail.js) tags externally if you do not have access to developer resources.
   *
   */
  tags?: Tag[];
}
