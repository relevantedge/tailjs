import type { TrackerExtensionFactory } from "..";
import { commandTest } from "./shared";

export interface ExtensionCommand {
  extension: TrackerExtensionFactory;
  priority?: number;
}
export const isExtensionCommand = commandTest<ExtensionCommand>("extension");
