import type { JsxConfiguration } from "@tailjs/react";

export type NextJsxConfiguration =
  | Omit<JsxConfiguration, "tracker"> & {
      tracker: Omit<JsxConfiguration["tracker"], "script"> & {
        script?: boolean;
      };
    };
export const createClientConfiguration = (
  config: NextJsxConfiguration
): JsxConfiguration => {
  config.tracker ??= {};

  const script = config.tracker.script;
  if (script !== false) {
    (config.tracker as JsxConfiguration["tracker"]).script = {
      src: "/api/tailjs",
    };
    // (config as JsxConfiguration).tracker.script = () => ({
    //   type: import("next/script.js") as any,
    //   props: {
    //     src: "/api/tailjs",
    //     strategy: "beforeInteractive",
    //     async: true,

    //     ...(typeof script === "object" ? script : {}),
    //   } satisfies ScriptProps,
    // });
  }

  return config as JsxConfiguration;
};
