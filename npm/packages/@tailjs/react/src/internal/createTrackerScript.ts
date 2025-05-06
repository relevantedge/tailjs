import { BUILD_REVISION_QUERY } from "@constants";
import InnerReact, { ReactNode } from "react";

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

export const createTrackerScript = (
  settings: TrackerScriptSettings,
  elementFactory = InnerReact.createElement
) => {
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
    elementFactory("script", {
      src: endpoint,
      async,
      ...cmp,
    });

  return scriptElement;
};
