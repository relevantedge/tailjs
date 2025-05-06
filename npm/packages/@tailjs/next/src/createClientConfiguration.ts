import type { JsxConfiguration } from "@tailjs/react";
import type { ScriptProps } from "next/script.js";

import Head from "next/head";

export type TrackerScriptStrategy = ScriptProps["strategy"] | "html";
export type TrackerScriptStrategyContainer = {
  /**
   * The same options as {@link ScriptProps.strategy} or `html` than renders an HTML `<script>` tag inline.
   * @default afterInteractive
   */
  strategy?: TrackerScriptStrategy;
};
export const createClientConfiguration = (
  config: JsxConfiguration
): JsxConfiguration => {
  if (!config.tracker) {
    config.tracker = {};
  }

  let script = config.tracker.script;
  if (script == null || typeof script === "object") {
    script ??= {};
    script.src ??= "/api/tailjs";
    config.tracker.script = script;
  }
  return config;
};
