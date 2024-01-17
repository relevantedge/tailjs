import type { CommerceData, Component, ExternalReference, Tagged } from ".";

/**
 * Represents a content item that can be rendered or modified via a {@link Component}
 *
 * If the content is personalized please add the criteria
 *
 */
export interface Content extends ExternalReference, Tagged {
  commerce?: CommerceData;
}
