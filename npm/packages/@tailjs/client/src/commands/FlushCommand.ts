import { T } from "@tailjs/util";
import { commandTest } from "./shared";

/**
 * Causes all queued events to be posted to the server immediately.
 */
export type FlushCommand = { flush: boolean; force?: boolean; defer?: boolean };
export const isFlushCommand = commandTest<FlushCommand>(T, "flush");
