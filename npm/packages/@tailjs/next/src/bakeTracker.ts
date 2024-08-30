import { Tracker } from "@tailjs/react";
import Script from "next/script";
import { createElement, FunctionComponent, PropsWithChildren } from "react";
import type { ClientConfiguration } from ".";

const isClientRef = (el: any) =>
  (el as any)?.type?.$$typeof?.toString() === "Symbol(react.client.reference)";

export type ConfiguredTrackerComponent = FunctionComponent<
  PropsWithChildren<{ root?: boolean }>
>;

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
  {
    tracker: {
      map,
      endpoint = process.env.NEXT_PUBLIC_TAILJS_API || "/api/tailjs",
      scriptTag,
    },
  }: ClientConfiguration,
  clientTracker?: ConfiguredTrackerComponent
): ConfiguredTrackerComponent => {
  const clientSide = !clientTracker;

  const ConfiguredTracker: ConfiguredTrackerComponent = ({
    children,
    root = true,
  }) => {
    return createElement(Tracker, {
      map,
      ssg: !clientSide,
      stoppers: [ConfiguredTracker, clientTracker],
      scriptTag: root ? scriptTag : false,
      endpoint,
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
  };

  return ConfiguredTracker;
};
