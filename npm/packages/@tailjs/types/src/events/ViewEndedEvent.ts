import type { TrackedEvent, ViewTimingEvent } from "..";
import { typeTest } from "../util/type-test";

export interface ViewEndedEvent extends TrackedEvent, ViewTimingEvent {
  type: "VIEW_ENDED";
  bounce?: boolean;
}

export const isViewEndedEvent = typeTest<ViewEndedEvent>("VIEW_ENDED");
