import { BUILD_REVISION_QUERY } from "@constants";
import { createElement, ReactNode } from "react";

export type TrackerScriptSettings<AdditionalProps extends {} = {}> =
  | undefined
  | false
  | ({
      endpoint?: string;
      cmp?: Record<string, any>;
      async?: boolean;
      create?(props: {
        endpoint: string;
        async: boolean;
        htmlAttrs: Record<string, any>;
      }): ReactNode;
    } & AdditionalProps);

export const createTrackerScript = (settings: TrackerScriptSettings) => {
  if (!settings) {
    return null;
  }

  const { async = true, cmp = { "data-cookieconsent": "ignore" } } = settings;

  let endpoint = settings.endpoint ?? "/_t.js";
  endpoint +=
    (endpoint.includes("?") ? (endpoint.endsWith("&") ? "" : "&") : "?") +
    BUILD_REVISION_QUERY;
  const scriptElement =
    settings.create?.({ endpoint, async, htmlAttrs: cmp }) ??
    createElement("script", {
      src: endpoint,
      async,
      ...cmp,
    });

  return scriptElement;
};
