import React, { FunctionComponent, PropsWithChildren } from "react";

import {
  BoundaryData,
  Tracker as TrackerType,
  tail,
} from "@tailjs/client/external";
import { Content } from "@tailjs/types";

import {
  BUILD_REVISION_QUERY,
  INIT_SCRIPT_QUERY,
  PLACEHOLDER_SCRIPT,
} from "@constants";
import {
  IncludeExcludeRules,
  MapState,
  compileIncludeExcludeRules,
  concatRules,
} from ".";
import {
  ParseOverrideFunction,
  TraverseContext,
  mergeStates,
} from "./internal";

export interface BoundaryDataWithView extends BoundaryData {
  view?: Content | null;
}
export type JsxMappingContext = TraverseContext<BoundaryData, TrackerType>;

export type BoundaryDataMapper = (
  element: JSX.Element,
  context: JsxMappingContext
) => null | false | void | BoundaryDataWithView;

export type TrackerProperties = PropsWithChildren<{
  /**
   * This function intercepts all React elements before they are rendered
   * as a central and solid means for inferring CMS context based on properties or (React) component types.
   */
  map?: BoundaryDataMapper | BoundaryDataMapper[];

  /**
   * Whether the names of React components are included in the tracking context or not.
   * This means you can track user behavior back to which React components that got clicked
   * in the parts of your website where there are no explicitly defined context (e.g. content from a CMS).
   */
  trackReactComponents?: boolean;

  /**
   * The URL for the tail.js request handler
   */
  endpoint?: string;

  /**
   * Do not track. It may be easier to set this property than to add/remove the component.
   */
  disabled?: boolean;
  /**
   * Components who are explicitly mentioned here, or whose name/display name matches
   * any of the rules will not be included for context in tracked events.
   * (It will probably not help you much in analytics to know that someone clicked a button in the
   * "MainContentRouterLayoutBoundaryManager3", right?).
   *
   * If stuff gets too complicated you can also specify a custom function that does whatever logic you need.
   *
   * @default [/(Router|Boundary|Handler)$/]
   */
  exclude?: IncludeExcludeRules;

  /**
   * Same as {@link exclude}, just the other way around. If something
   * is included it will not be excluded, yet, if it is not included but also not excluded, it will get included.
   *
   * If both include and exclude are specified, these are the rules:
   * ```
   * Include + whatever = Include
   * Not include + Exclude = Exclude
   * Not include + Not Exclude = Include
   * ```
   *
   */
  include?: IncludeExcludeRules;

  /**
   * These components will not be parsed, so content, tags etc.
   * will not be inferred in anything they render. This may be desireable
   * for components with A LOT of children such as a data visualizations.
   * (Or some twisted edge case this library does not support, hence break rendering 🤞).
   */
  stoppers?: IncludeExcludeRules;

  /**
   * The JSX for the script tag that will include the tracker script.
   */
  scriptTag?: boolean | JSX.Element | ((endpoint: string) => JSX.Element);

  /**
   * The collected tracking contexts will be embedded statically in the rendered HTML without the need for client-side hydration.
   * Use this for static site generation (SSG).
   *
   * It defaults to `false` in normal React, and `true` in contexts that support server-side components.
   */
  ssg?: boolean;

  /**
   * Allows custom parsing of certain elements. A good example is the NextJs configuration
   * for the tracker that supports client and server components.
   */
  parseOverride?: ParseOverrideFunction;
}>;

const TrackerRendered = () => {
  tail({ set: { scope: "view", key: "rendered", value: true } });
  return null;
};

const BoundaryReferences = ({ references }: { references: () => any[] }) => {
  const components = references();

  return (
    typeof window === "undefined" &&
    components.length > 0 && (
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `${PLACEHOLDER_SCRIPT("tail", true)}tail(${JSON.stringify({
            scan: { attribute: "_t", components },
          })});`,
        }}
      ></script>
    )
  );
};

const forEach = <T,>(item: T, action: (item: T) => void) =>
  item && (Array.isArray(item) ? item.forEach(action) : action(item));

export const Tracker = ({
  children,
  map,
  trackReactComponents = true,
  disabled = false,
  endpoint,
  include,
  exclude,
  stoppers,
  scriptTag = true,
  ssg: embedBoundaryData = false,
  parseOverride,
}: TrackerProperties) => {
  if (disabled) {
    return <>{children}</>;
  }
  if (disabled) {
    tail({ disable: true });
  } else {
    tail({ disable: false });
  }

  const mappers = Array.isArray(map) ? map : map ? [map] : [];

  exclude ??= [/(Router|Boundary|Handler)$/];
  const excludeType = compileIncludeExcludeRules(include, exclude);
  let stop = compileIncludeExcludeRules(
    undefined,
    concatRules([Tracker], stoppers)
  );

  if (scriptTag !== false) {
    if (scriptTag === true) {
      scriptTag = <script async></script>;
    }
    endpoint ??=
      (typeof scriptTag === "function" ? null : scriptTag.props.src) ||
      "/_t.js";

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

  const seen = new Set<string>();
  return (
    <>
      <MapState
        context={tail}
        parse={parseOverride}
        ignoreType={stop}
        mapState={(el, state: BoundaryDataWithView | null, context) => {
          const mapped: BoundaryDataWithView[] = mappers
            .map((mapper) => mapper(el, context))
            .filter((item) => item) as any;

          let allMapped: BoundaryDataWithView | undefined;
          for (const prop of ["component", "content"]) {
            seen.clear();
            // Add the IDs we already have, lest we add them again.
            forEach(context.state?.[prop], (cmp: any) => seen.add(cmp.id));

            for (const item of mapped) {
              forEach(
                item[prop],
                (item) =>
                  !seen.has(item.id) &&
                  (seen.add(item.id),
                  ((allMapped ??= {})[prop] ??= []).push(item))
              );
            }
          }

          for (const item of mapped) {
            if (item?.area) {
              (allMapped ??= {}).area = item.area;
            }
            if (item?.view && !allMapped?.view) {
              context.context({
                set: {
                  scope: "view",
                  key: "view",
                  value: ((allMapped ??= {}).view = item.view),
                },
              });
            }
          }

          if (typeof el.type === "string") {
            // Ignore DOM elements unless explicitly told not to. We only want to wire the immediate children of JSX components.
            return allMapped ?? null;
          }

          if (
            trackReactComponents &&
            (!allMapped?.component as any) &&
            el.type.name &&
            !excludeType?.(el.type)
          ) {
            // If we do not have an explicit component, let's see if we can use one from React.
            (allMapped ??= {}).component = [
              {
                id: el.type.displayName || el.type.name,
                inferred: true,
                source: "react",
              },
            ];
          }
          return mergeStates(state, allMapped);
        }}
        patchProperties={(el, parentState, currentState) => {
          if (stop?.(el.type)) {
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
              const key = JSON.stringify(parentState);
              let current = collectedBoundaryReferences!.get(key);
              !current &&
                collectedBoundaryReferences!.set(
                  key,
                  (current = [parentState, collectedBoundaryReferences!.size])
                );

              const [, index] = current;

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
      {embedBoundaryData && typeof window === "undefined" && (
        <BoundaryReferences
          references={() =>
            Object.entries(collectedBoundaryReferences!).map(
              ([, [data]]) => data
            )
          }
        />
      )}
      {scriptTag}
      {!disabled && <TrackerRendered />}
    </>
  );
};

function getRef({ component, content, area, tags, cart }: BoundaryData) {
  let current: HTMLElement | null = null;

  return (el: HTMLElement | null) => {
    if (el === current) return;
    if ((current = el) != null) {
      if (component || content || area || tags || cart) {
        tail({
          component,
          content,
          area,
          tags,
          cart,
          boundary: current,
        });
      }
    }
  };
}
