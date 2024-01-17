import type { Component, ExternalReference } from "@tailjs/types";
import { commandTest } from "./shared";

export type ComponentOrContent =
  | { component: Component }
  | { content: ExternalReference };

/**
 * Registers an element as the boundary for a component. All events triggered from the element or its descendants will have this information attached.
 * In case of nested boundaries the closest one is used.
 */
export interface ScanComponentsCommand {
  scan: {
    attribute: string;
    components: ComponentOrContent[];
  };
}

export const isScanComponentsCommand =
  commandTest<ScanComponentsCommand>("scan");
