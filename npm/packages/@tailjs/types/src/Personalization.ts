import type { ExternalReference, Tagged } from ".";

/**
 * A specific aspect changed for a page or component for personalization as part of a {@link PersonalizationVariant}.
 *
 */
export interface PersonalizationSource extends ExternalReference {
  /**
   * In case of a multi-variate test (or similar) that runs over multiple components and/or pages, this can be the ID of the specific variable that decided personalization for a specific component.
   */
  relatedVariable?: string;

  /**
   * The kind of personalization that relates to this item.
   */
  personalizationType?: string;
}

/**
 * A reference to the data/content item related to a variant in personalization.
 */
export interface PersonalizationVariant extends ExternalReference {
  /**
   * The aspects of the component or page the variant changed.
   * There can multiple sources, e.g. a variant may both change the size of a component and change the content at the same time.
   */
  sources?: PersonalizationSource[];
  /**
   * If the reference is the default variant.
   *
   * @default false
   */
  default?: boolean;

  /**
   * If the variant could have been picked.
   */
  eligible?: boolean;

  /**
   * If the variant was chosen.
   */
  selected?: boolean;
}

/**
 * A reference to a variable and its value in personalization.
 */
export interface PersonalizationVariable extends ExternalReference {
  value: string;
}
/**
 * The choices made by some logic to show different content to different users depending on some traits either to help them or to make them buy more.
 */
export interface Personalization extends Tagged {
  /**
   * The source and definition for the personalization.
   * This could be a named rule set, a test definition or a specific configuration of an algorithm.
   *
   * If you are using multiple services/system for personalization you can add this to {@link ExternalReference.source}.
   *
   * If more than one component was changed by the same personalization logic they will share this source, but may have different variables.
   *
   * For example, the personalization in each component may correspond to different variables in a multivariate test.
   * In that case the components will share the {@link Personalization.source} corresponding to the test, but have different {@link Personalization.variable}s.
   */
  source?: ExternalReference;

  /**
   * Typically used for the test variables in a A/B/MV test, but can also be used for significant weights/parameters in more complex algorithms.
   */
  variables?: PersonalizationVariable[];

  /**
   * The set of choices that were possible at the time given the user.
   * Even though implied, this should include the choice made so the data does not look inconsistent.
   *
   * To represent the default valuesvfor the sources that can be personalized, include the default variant and assign the default settings to it as sources.
   */
  variants?: PersonalizationVariant[];
}
