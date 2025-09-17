import { appendClientScriptRevision } from "@tailjs/client/version";
import type { JsxConfiguration } from "@tailjs/react";

export type NextJsxConfiguration =
  | Omit<JsxConfiguration, "tracker"> & {
      tracker: Omit<JsxConfiguration["tracker"], "script"> & {
        /**
         * The route for the script.
         * @default "/api/tailjs"
         */
        script?:
          | boolean
          | string
          | {
              /** @default "/api/tailjs" */
              route?: string;
              /** Whether `_rev=(client script revision)` gets appended to the route to avoid caching issues. */
              appendRevision?: boolean;
            };
      };
    };
export const createClientConfiguration = (
  config: NextJsxConfiguration
): JsxConfiguration => {
  config.tracker ??= {};

  let script = config.tracker.script;
  let appendRevision = true;
  if (typeof script === "object") {
    appendRevision = script.appendRevision ?? true;
    script = script.route;
  }
  if (script !== false) {
    if (!script || typeof script !== "string") {
      script = "/api/tailjs";
    }

    if (appendRevision) {
      script = appendClientScriptRevision(script);
    }
    (config.tracker as JsxConfiguration["tracker"]).script = { src: script };
  }

  return config as JsxConfiguration;
};
