import type { TrackerProperties, TrackerScriptSettings } from "@tailjs/react";
import type { ScriptProps } from "next/script.js";

export type TrackerScriptStrategy = ScriptProps["strategy"] | "html";
export type TrackerScriptStrategyContainer = {
  /**
   * The same options as {@link ScriptProps.strategy} or `html` than renders an HTML `<script>` tag inline.
   * @default afterInteractive
   */
  strategy?: TrackerScriptStrategy;
};
export type ClientConfiguration = {
  tracker: Pick<
    TrackerProperties,
    "map" | "include" | "exclude" | "stoppers"
  > & {
    script?: TrackerScriptSettings<TrackerScriptStrategyContainer>;
  };
};

export const createClientConfiguration = (config: ClientConfiguration) =>
  config;
