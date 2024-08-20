import React, { Component, ComponentFactory, PropsWithChildren } from "react";

import {
  BoundaryCommand,
  BoundaryData,
  Tracker as TrackerType,
  tail,
} from "@tailjs/client/external";
import { Content } from "@tailjs/types";
import { get, map as mapItems, restrict } from "@tailjs/util";

import {
  BUILD_REVISION_QUERY,
  INIT_SCRIPT_QUERY,
  PLACEHOLDER_SCRIPT,
} from "@constants";
import { MapState } from ".";
import {
  ConfiguredTrackerSettings,
  TraverseContext,
  filterCurrent,
  mergeStates,
} from "./internal";

export interface BoundaryDataWithView extends BoundaryData {
  view?: Content | null;
}
export type JsxMappingContext = TraverseContext<BoundaryData, TrackerType>;

export type BoundaryDataMapper = (
  element: JSX.Element,
  context: JsxMappingContext
) => null | void | BoundaryDataWithView;

export type TrackerProperties = PropsWithChildren<
  {
    map?: BoundaryDataMapper;
    trackReactComponents?: boolean;
    endpoint?: string;
    disabled?: boolean;
    exclude?: RegExp;
    ignore?: (ComponentFactory<any, any> | Component)[];
    scriptTag?: boolean | JSX.Element | ((endpoint: string) => JSX.Element);
    embedBoundaryData?: boolean;
  } & ConfiguredTrackerSettings
>;

const BoundaryReferences = ({ references }: { references: () => any[] }) => {
  const components = references();

  return (
    components.length > 0 && (
      <script
        dangerouslySetInnerHTML={{
          __html: `${PLACEHOLDER_SCRIPT("tail", true)}tail(${JSON.stringify({
            scan: { attribute: "_t", components },
          })});`,
        }}
      ></script>
    )
  );
};

export const Tracker = ({
  children,
  map,
  trackReactComponents = true,
  disabled = false,
  endpoint,
  exclude,
  ignore,
  scriptTag = true,
  serverTracker,
  clientTracker,
  embedBoundaryData = false,
  clientComponentContext,
}: TrackerProperties) => {
  if (disabled) {
    return <>{children}</>;
  }
  if (disabled) {
    tail({ disable: true });
  } else {
    tail(
      { disable: false },
      { set: { scope: "view", key: "rendered", value: true } }
    );
  }

  const ignoreMap = ignore ? new Set(ignore) : null;

  if (scriptTag !== false) {
    if (scriptTag === true) {
      scriptTag = <script async></script>;
    }
    endpoint ??=
      (typeof scriptTag === "function" ? "" : scriptTag.props.src) || "/_t.js";

    endpoint = [
      // Strip whatever querystring and hash that might be in the endpoint URI,
      endpoint!.replace(/[?#].*/, ""),
      "?",
      // append the "?init" parameter,
      INIT_SCRIPT_QUERY,
      // and a cache buster.
      BUILD_REVISION_QUERY ? "&" + BUILD_REVISION_QUERY : "",
    ].join("");

    scriptTag =
      typeof scriptTag === "function"
        ? scriptTag(endpoint)
        : { ...scriptTag, props: { ...scriptTag.props, src: endpoint } };
  }

  /** Boundary data for SSR rendered elements. */
  const collectedBoundaryReferences:
    | Map<any, [data: any, index: number]>
    | undefined = embedBoundaryData ? new Map() : undefined;

  return (
    <>
      <MapState
        context={tail}
        clientTracker={clientTracker}
        serverTracker={serverTracker}
        clientComponentContext={clientComponentContext}
        mapState={(el, state: BoundaryDataWithView | null, context) => {
          let mapped = map?.(el, context);

          if (mapped?.component) {
            mapped.component = filterCurrent(
              context.state?.component,
              mapped.component,
              (item) => item.id
            );
          }

          if (mapped?.content) {
            mapped.content = filterCurrent(
              context.state?.content,
              mapped.content,
              (item) => item.id
            );
          }

          if (mapped?.area) {
            mapped.area = context.state?.area || mapped.area;
          }

          if (typeof el.type === "string") {
            // Ignore DOM elements unless explicitly told not to. We only want to wire the immediate children of JSX components.
            return mapped ?? null;
          }

          if (mapped?.view) {
            context.context({
              set: { scope: "view", key: "view", value: mapped.view },
            });
          }

          if (
            trackReactComponents &&
            (!mapped?.component as any) &&
            el.type.name &&
            (!exclude || !el.type.name.match(exclude))
          ) {
            mapped = {
              ...mapped,
              component: {
                id: el.type.displayName || el.type.name,
                inferred: true,
                source: "react",
              },
            };
          }

          return mergeStates(state, mapped);
        }}
        patchProperties={(el, parentState, currentState) => {
          if (ignoreMap?.has(el.type)) {
            return false;
          }

          let props: any = undefined;
          const html = typeof el.type === "string";
          let tags = el.props && el.props["track-tags"];
          if (tags) {
            if (!html) {
              currentState = mergeStates(currentState, { tags });
              props = { ...el.props };
              delete props["track-tags"];
            } else {
              parentState = mergeStates(parentState, { tags });
            }
          }

          if ((tags = parentState?.tags)) {
            props = {
              ...el.props,
              ["track-tags"]: tags,
            };
          }

          let updated: Record<string, any> | undefined;
          if ((updated = scanProperties(props ?? el.props))) {
            props = updated;
          } else {
            // Also decent first level properties if no properties are found in case item data is passed a property like `props: {item: T}` instead of `props: T`.

            for (const key in el.props) {
              updated = scanProperties(el.props[key]);
              if (updated) {
                props ??= el.props;
                props[key] = updated;
              }
            }
          }

          function scanProperties(props: Record<string, any>) {
            const orgProps = props;
            for (const [name, patch] of [
              ["track-area", (value) => ({ area: value })],
              [
                "track-component",
                (value) => ({
                  component: typeof value === "string" ? { id: value } : value,
                }),
              ],
              ["track-tags", (value) => ({ tags: value })],
              ["track-content", (value) => ({ content: value })],
              ["track-cart", (value) => ({ cart: value })],
            ] as [string, (value: any) => BoundaryData][]) {
              if (props && props[name]) {
                if (html) {
                  // Attach the HTML element's tracker configuration to itself.
                  parentState = mergeStates(parentState, patch(props[name]));
                } else {
                  // Attach the component's tracker configuration to the first
                  // suitable HTML elements.
                  currentState = mergeStates(currentState, patch(props[name]));
                }
                props = { ...props };

                delete props[name];
              }
            }
            return props !== orgProps ? props : undefined;
          }

          if (
            html &&
            parentState &&
            (parentState.component ||
              parentState.content ||
              parentState.area ||
              parentState.cart ||
              parentState.tags)
          ) {
            if (embedBoundaryData) {
              const [, index] = get(
                collectedBoundaryReferences,
                JSON.stringify(parentState),
                () => [parentState, collectedBoundaryReferences!.size]
              );

              return {
                props: {
                  ...(props ?? el.props),
                  _t: index.toString(36),
                },
                ref:
                  typeof window !== "undefined"
                    ? getRef(parentState)
                    : undefined,
                state: currentState,
              };
            } else if (typeof window !== "undefined") {
              const ref = getRef(parentState);
              return props
                ? { props: props, ref, state: currentState }
                : { ref };
            }
          }

          if (props) {
            return { props, state: currentState };
          }
        }}
      >
        {children}
      </MapState>
      {embedBoundaryData && (
        <BoundaryReferences
          references={() =>
            mapItems(collectedBoundaryReferences!, ([, [data]]) => data)
          }
        />
      )}
      {scriptTag}
    </>
  );
};

function getRef({ component, content, area, tags, cart }: BoundaryData) {
  let current: HTMLElement | null = null;

  return (el: HTMLElement | null) => {
    if (el === current) return;
    if ((current = el) != null) {
      if (component || content || area || tags || cart) {
        tail(
          restrict<BoundaryCommand>({
            component,
            content,
            area,
            tags,
            cart,
            boundary: current,
          })
        );
      }
    }
  };
}
