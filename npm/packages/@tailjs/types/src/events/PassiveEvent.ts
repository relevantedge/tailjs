import { EventMetadata, LocalID, TrackedEvent } from "..";

export const isPassiveEvent = (
  value: any
): value is {
  metadata: EventMetadata & {
    passive: true;
  };
} =>
  !!(
    (value?.metadata as EventMetadata)?.passive ||
    (value as TrackedEvent)?.patchTargetId
  );
