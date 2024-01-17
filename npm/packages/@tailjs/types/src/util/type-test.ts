import { TrackedEvent } from "../events";

export const typeTest =
  <T extends TrackedEvent>(...types: string[]) =>
  (ev: any): ev is T =>
    ev?.type && types.some((type) => type === ev?.type);
