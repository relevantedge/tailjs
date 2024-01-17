import { LocalID, TrackedEvent } from "..";

export function transformLocalIds(
  ev: TrackedEvent,
  transform: (id: LocalID) => LocalID | false
) {
  ev = { ...ev };
  assign(ev, "id");
  assign(ev, "view");
  assign(ev, "related");

  return ev;

  function assign(target: any, property: string) {
    if (target?.[property]) {
      target[property] = transform(target[property]) || target[property];
    }
  }
}
