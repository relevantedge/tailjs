import { OmitUnion } from "@tailjs/util";
import type { TrackerClientConfiguration } from "..";

export const isTracker = "__isTracker";

export const trackerConfig: Required<
  OmitUnion<TrackerClientConfiguration, "scriptBlockerAttributes">
> = {
  name: "tail",
  src: "/_t.js",
  disabled: false,
  postEvents: true,
  postFrequency: 2000,
  requestTimeout: 5000,
  encryptionKey: null,
  key: null,
  apiKey: null,
  json: false,

  /**
   * Log events to the browser's developer console.
   */
  impressionThreshold: 1000,
  captureContextMenu: true,

  tags: { default: ["data-id", "data-name"] },
};
