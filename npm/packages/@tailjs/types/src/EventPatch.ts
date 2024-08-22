import type { TrackedEvent } from ".";

/** The shape of the patch data for a {@link TrackedEvent} */
export type EventPatch<T extends TrackedEvent = TrackedEvent> = Partial<
  Omit<T, "type">
> & {
  type: `${T["type"]}_patch`;
} & Required<Pick<TrackedEvent, "patchTargetId">>;

export const isEventPatch = (value: any): value is EventPatch =>
  !!value?.patchTargetId;
