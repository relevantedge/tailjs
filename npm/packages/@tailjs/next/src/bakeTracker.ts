import { Tracker, TrackerScriptSettings } from "@tailjs/react";
import { createElement, FunctionComponent, PropsWithChildren } from "react";
import type {
  ClientConfiguration,
  TrackerScriptStrategy,
  TrackerScriptStrategyContainer,
} from ".";
import Script, { ScriptProps } from "next/script.js";

const isClientRef = (el: any) =>
  (el as any)?.type?.$$typeof?.toString() === "Symbol(react.client.reference)";

export type ConfiguredTrackerComponent = FunctionComponent<
  PropsWithChildren<{ root?: boolean } & TrackerScriptStrategyContainer>
> & {
  /**
   * Use this element as a last resort if it is otherwise impossible to make the tail.js script come before CMPs that blocks it.
   * You can optionally use the {@link TrackerScriptStrategy} `html` to force the script to be rendered as soon as possible.
   *
   * Typically, it is enough just to add the CMP tags as {@link Script} components, as long as the Tracker's script is configured
   * with the same {@link ScriptProps.strategy} or sooner.
   */
  Script: FunctionComponent<TrackerScriptStrategyContainer>;
};

/**
 * "Bakes" a mapping function into the Tracker component so it can be used
 * across client and server component boundaries.
 *
 * To make it work two (almost) identical components must be created
 * for the client and the server respectively. The only differences are
 * that the client component has the "use client" directive, and
 * the server component includes a reference to the client component:
 *
 * ```
 * // ConfiguredTracker.Client.ts
 * import {compileTracker} from "@tailjs/next";
 * import configuration from "../path/to/.../tailjs.client.config";
 * export const ConfiguredClientTracker = compileTracker(configuration);
 * ```
 *
 * ```
 * // ConfiguredTracker.Server.ts
 * import {compileTracker} from "@tailjs/next";
 * import configuration from "../path/to/.../tailjs.client.config";
 * import {ConfiguredClientTracker} from "./ConfiguredTracker.Client";
 * export const ConfiguredTracker = compileTracker(configuration, ConfiguredClientTracker);
 * ```
 */
export const bakeTracker = (
  { tracker: { map, script } = {} }: ClientConfiguration,
  clientTracker?: ConfiguredTrackerComponent
): ConfiguredTrackerComponent => {
  script = applyStrategy(script ?? {});

  if (script) {
    script.strategy ??= "afterInteractive";
    script.endpoint ??= process.env.NEXT_PUBLIC_TAILJS_API || "/api/tailjs";
  }

  const clientSide = !clientTracker;

  const ConfiguredTracker: ConfiguredTrackerComponent = Object.assign(
    ({ children, root = true, strategy }) => {
      return createElement(Tracker, {
        map,
        ssg: !clientSide,
        stoppers: [ConfiguredTracker, clientTracker],
        script: root ? applyStrategy(script, strategy) : false,
        key: root ? "tracker" : undefined,
        exclude: ["RenderFromTemplateContext"],
        parseOverride(el, traverse) {
          if (isClientRef(el)) {
            if (!clientTracker) {
              throw new Error(
                "Client components cannot be tracked from the server unless a client version is also configured (cf. the description of bakeTracker in @tailjs/next)."
              );
            }
            return createElement(clientTracker, {
              children: traverse(el),
              root: false,
            });
          }
        },
        children,
      });
    },
    {
      Script: ({ strategy }) =>
        createElement(Tracker.Script, {
          script: applyStrategy(script, strategy),
        }),
    }
  );

  return ConfiguredTracker;
};

const applyStrategy = (
  script: ClientConfiguration["tracker"]["script"],
  strategy = script ? script.strategy : undefined
) => {
  if (script && strategy) {
    script = { ...script };

    script.create =
      strategy !== "html"
        ? ({ endpoint, async, htmlAttrs }) =>
            createElement(Script, {
              src: endpoint,
              async,
              strategy,
              ...htmlAttrs,
            } as any)
        : undefined;
  }
  return script;
};
