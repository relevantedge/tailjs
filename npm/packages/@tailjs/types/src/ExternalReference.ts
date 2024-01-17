/**
 * Represent a reference to externally defined data.
 *
 * Have in mind that the reference does not need to point to an external system or database.
 * It can just as well be a named reference to a React component, the value of a MV test variable or event just some hard-coded value.
 *
 * The tailjs model generally prefers using external references rather than simple strings for most properties
 * since that gives you the option to collect structured data that integrates well in, say, BI scenarios.
 *
 * The tenent is that if you only use an URL from a web page, or the name of a campaign you will lose the ability to easily track these historically if/when they change.
 * Even when correctly referencing a immutable ID you might still want to include the name to make it possible to add labels in your analytics reporting without integrating additional data sources.
 * The names may then still be wrong after some time, but at least then you have the IDs data does not get lost, and you have a path for correcting it.
 *
 * Again, if you only have some hard-coded value, you can just make an external reference and use its {@link id} property for the value.
 * Hopefully, you will find that a little bit annoying every time you do it and make you start thinking about that you might in fact reference some external information that has an immutable ID.
 *
 */
export interface ExternalReference {
  /**
   * The ID as defined by some external source, e.g. CMS.
   *
   * The property is required but an empty string is permitted.
   * The library itself uses the empty string to indicate an "empty" root component if a page has content that is not wrapped in a component.
   */
  id: string;

  /**
   * Optionally, the version of the item in case the external source supports versioning.
   */
  version?: string;

  /**
   * Optionally, the language of the item in case the external source supports localization.
   */
  language?: string;

  /**
   * Optionally, the ID of the external system referenced.
   */
  source?: string;

  /**
   * Optionally, how the item is referenced in case the external source supports multiple kinds of references, e.g. "parent" or "pointer".
   */
  referenceType?: string;

  /**
   * Flag to indicate that this data comes from an external system that you do not control.
   */
  isExternal?: boolean;

  /**
   *   Optionally, the name of the item at the time an event was recorded.
   *   Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.
   */
  name?: string;

  /**
   * Optionally, the type of item referenced. In CMS context this corresponds to "template".
   * Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.
   */
  itemType?: string;

  /**
   *  Optionally, the path of the item at the time the event was recorded.
   *  Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.
   */
  path?: string;
}
