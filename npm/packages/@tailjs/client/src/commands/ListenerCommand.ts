import type { Listener } from "..";
import { commandTest } from "./shared";

/**
 * Registers a listener that will be invoked before and after events are flushed.
 * Useful for debugging or client-side integration with other tracker libraries (if one absolutely must).
 */
export interface ListenerCommand {
  listener: Listener;
}
export const isListenerCommand = commandTest<ListenerCommand>("listener");
