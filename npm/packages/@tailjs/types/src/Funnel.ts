import type { ExternalReference, Integer } from ".";

/**
 * @internal
 */
export interface FunnelStage extends ExternalReference {
  /**
   * The step number in the funnel.
   *
   * Since this number is targeted towards marketers and other business it is 1-indexed (the first step has number 1, not 0 like in programming).
   */
  stepNumber: Integer;
}

/**
 * The definition of a marketing funnel.
 *
 * Should you wonder what that is, a funnel idealizes the theoretical customer journey toward the purchase of a good or service, signup or a similar significant conversion.
 *
 * @internal
 */
export interface Funnel extends ExternalReference {
  /**
   * The steps in the funnel.
   */
  stage: FunnelStage[];
}
