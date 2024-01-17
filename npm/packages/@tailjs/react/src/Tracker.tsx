import React, { PropsWithChildren } from "react";

import {
  BoundaryCommand,
  BoundaryData,
  Tracker as TrackerType,
  isExternal,
  tail,
} from "@tailjs/client/external";

import {
  MapState,
  TraverseContext,
  filterCurrent,
  mergeStates,
} from "./internal";
import { Content, cast } from "@tailjs/types";

export interface BoundaryDataWithView extends BoundaryData {
  view?: Content | null;
}

export type TrackerProperties = PropsWithChildren<{
  map?(
    element: JSX.Element,
    context: TraverseContext<BoundaryData, TrackerType>
  ): null | void | BoundaryDataWithView;
  trackReactComponents?: boolean;
  disabled?: boolean;
  exclude?: RegExp;
}>;

export const Tracker = ({
  children,
  map,
  trackReactComponents = false,
  disabled = false,
  exclude = /ErrorBoundary|Provider|Route[a-z_]*|Switch|[a-z_]*Context/gi,
}: TrackerProperties) => {
  if (!isExternal()) {
    tail.push({ set: { rendered: true } });
  }
  tail.push({ disable: disabled });

  return (
    <MapState
      context={tail}
      mapState={(el, state: BoundaryDataWithView | null, context) => {
        let mapped = map?.(el, context);

        const name = el.type?.name ?? el.type?.prototype?.name;

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
          context.context.push({ set: { view: mapped.view } });
        }

        if (
          trackReactComponents &&
          (!mapped?.component as any) &&
          el.type.name &&
          !el.type._context &&
          !el.type.name.match(exclude)
        ) {
          mapped = {
            ...mapped,
            component: { id: el.type.name, inferred: true, source: "react" },
          };
        }

        return mergeStates(state, mapped);
      }}
      patchProperties={(el, parentState, currentState) => {
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
            ["track-tags"]: Array.isArray(tags) ? tags.join(",") : tags,
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
                parentState = mergeStates(parentState, patch(props[name]));
              } else {
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
          const ref = getRef(parentState);

          return props ? { props: props, ref, state: currentState } : { ref };
        } else if (props) {
          return { props, state: currentState };
        }
      }}
    >
      {children}
    </MapState>
  );
};

function getRef({ component, content, area, tags, cart }: BoundaryData) {
  let current: HTMLElement | null = null;

  return (el: HTMLElement | null) => {
    if (el === current) return;

    if ((current = el) != null) {
      if (component || content || area || tags || cart) {
        //        current.style.backgroundColor = "blue";
        //       current.title = JSON.stringify(component);
        tail.push(
          cast<BoundaryCommand>({
            component,
            content,
            area: area,
            tags,
            cart,
            boundary: current,
          })
        );
      }
    }
  };
}
