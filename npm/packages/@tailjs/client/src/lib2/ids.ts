export type UUID = string;

export const now = () => Math.trunc(performance.timeOrigin + performance.now());

export const TAB_ID =
  now().toString(36) +
  Math.trunc(1296 * Math.random())
    .toString(36)
    .padStart(2, "0");

let localId = 0;
export const nextId = () => TAB_ID + "_" + (++localId).toString(36);
