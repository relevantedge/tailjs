import type { Funnel, Integer, TrackedEvent } from "..";
import { typeTest } from "../util/type-test";

/**
 * The event that is send when a user transitions to a new stage in a {@link Funnel}.
 * (Not implented, do not expose in schema)
 * @internal
 */
export interface FunnelTransitionEvent extends TrackedEvent {
  type: "funnel_transition";

  /**
   * The ID to the {@link Funnel} where the transition happended.
   */
  funnel: string;

  /**
   * The ID of the stage the user transitioned to.
   */
  stage: string;

  /**
   * Optionally, the current number of the stage to disambiguate the transition should the funnel step definitions be changed at a later point.
   */
  stageNumber?: Integer;

  /**
   * Optionally, the ID of the previous stage to disambiguate the transition should the funnel steps definitions be changed at a later point.
   */
  from?: string;

  /**
   * Optionally indicates that the user transitioned to the final step in the funnel to disambiguate the transition should the funnel steps definitions be changed at a later point.
   *
   * @default false.
   */
  isFinalStage?: boolean;
}

export const isFunnelTransitionEvent =
  typeTest<FunnelTransitionEvent>("funnel_transition");
