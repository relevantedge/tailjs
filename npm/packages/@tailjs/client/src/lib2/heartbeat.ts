import { clear, clock, createEvent, forEach, now } from "@tailjs/util";
import { HEARTBEAT_FREQUENCY } from "./consts";

const [addHeartBeatListener, dispatchHeartbeat] =
  createEvent<[delta: number]>();
const heartbeat = clock(
  (delta) => dispatchHeartbeat(delta),
  HEARTBEAT_FREQUENCY
);

export const toggleHearbeat = (toggle: boolean) => heartbeat.toggle(toggle);

export { addHeartBeatListener };
