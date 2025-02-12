import {
  ComponentRendering,
  LayoutServiceData,
  PlaceholdersData,
  RouteData,
  SitecoreContext,
  useSitecoreContext,
} from "@sitecore-jss/sitecore-jss-nextjs";
import { BoundaryData } from "@tailjs/client/external";

const uuid =
  /\{?([a-fA-F0-9]{8})\-?([a-fA-F0-9]{4})\-?([a-fA-F0-9]{4})\-?([a-fA-F0-9]{4})\-?([a-fA-F0-9]{12})\}?/g;

import { Tracker } from "@tailjs/react";
import {
  Component,
  Content,
  Tagged,
  UserInteractionEvent,
} from "@tailjs/types";

import React, { PropsWithChildren } from "react";
import {
  getComponentPersonalization,
  getPagePersonalization,
} from "./plugins/personalize-plugin";

export type ComponentState = {
  uid: string;
  placeholder: string;
  component: ComponentRendering;
  updates: number;
  parent: ComponentState | null;
};

/**
 * When tags are mapped for a component or route, the result can optionally specify whether the tag also goes into {@link UserActivation.tags} or just sticks to the item.
 */
export type MappedTag =
  | undefined
  | null
  | string
  | [tag: string, activationTag: boolean];

/**
 * The rules to use to map tags. The keys are the IDs of the rules and does not have any other purpose than organizing the rules
 * so they are easier to maintain if you have many.
 *
 * Use `false` to suppress the default rule "tags" that matches fields and rendering parameters with the names `tags` or `Tags`.
 */
export type TagMappingRules<T> = Record<
  string,
  false | ((item: T) => string | MappedTag[] | undefined)
>;

export type ContentMapping = (el: JSX.Element) => Content | undefined;

type IncludeEvaluator =
  | string
  | RegExp
  | ((component: ComponentRendering) => boolean);

export type SitecoreTrackerProperties = PropsWithChildren<{
  /**
   * This components will always be included in the {@link UserInteractionEvent.components} list, also when a child component is activated.
   */
  stickyComponents?: IncludeEvaluator | IncludeEvaluator[];

  /**
   * These rules map data from a component rendering to a list of tags (cf. {@link Tagged}).
   */
  componentTags?: TagMappingRules<ComponentRendering>;

  /**
   * These rules map data the current route to a list of tags (cf. {@link Tagged}).
   */
  routeTags?: TagMappingRules<RouteData>;

  /**
   * Custom logic to map a React component to content by its properties.
   * The default is to look for properties that have `id`, `fields` and optionally `name`.
   */
  content?: ContentMapping;
}>;

const mapTags = (tags: string[] | undefined) => tags?.map((tag) => ({ tag }));

export const SitecoreTracker = ({
  children,
  stickyComponents:
    parentComponents = /^(?!.*(Partial|Placeholder|Container)).*$/g,
  componentTags = {},
  routeTags = {},
  content: userContent,
}: SitecoreTrackerProperties) => {
  let componentMap: Record<string, BoundaryData> = {};
  let componentTypeCounts: Record<string, number> = {};
  const { sitecoreContext } = useSitecoreContext();

  componentTags["tags"] ??= (component) =>
    [
      component.fields?.["tags"],
      component.fields?.["Tags"],
      component.params?.["tags"],
      component.params?.["Tags"],
    ].flatMap((value) => {
      value = (value as any)?.value ?? value;
      return typeof value === "string" && value
        ? value
            .split(/&/)
            .map((tag) => {
              const parts = tag.split("=").map(decodeURIComponent);
              // TODO: Escape ','
              return parts.length === 1 ? parts[0] : `${parts[0]}=${parts[1]}`;
            })
            .map(decodeURIComponent)
        : [];
    });

  routeTags["tags"] ??= componentTags["tags"] as any;

  const content = (el: any): Content[] => {
    const inner = userContent?.(el);
    if (inner) return [inner];

    const tryFindIdContainer = (props: any): Record<string, any> =>
      !props || typeof props !== "object"
        ? {}
        : props.id
        ? props
        : props.value?.id
        ? props.value
        : props.field
        ? tryFindIdContainer(props.field)
        : {};

    return (el.props ? [el.props, ...Object.values(el.props)] : [])
      .map((value) => {
        const { id, name, ...props } = tryFindIdContainer(value);

        return typeof id === "string" && id.match(uuid)
          ? {
              id,
              name,
              source: "sitecore",
            }
          : undefined!;
      })
      .filter(Boolean);
  };

  return (
    <Tracker
      trackReactComponents
      disabled={
        sitecoreContext?.pageState === "preview" ||
        sitecoreContext?.pageState === "edit"
      }
      map={(el) => {
        if (typeof el.type === "string") {
          // Ignore nested DOM elements. We only want to wire the immediate children of Sitecore components.
          return;
        }
        if (el.type === SitecoreContext) {
          const layoutData = el.props.layoutData as LayoutServiceData;

          if (typeof window !== "undefined") {
            console.groupCollapsed("SC layout data");
            console.debug(JSON.stringify(layoutData, null, 2));
            console.groupEnd();
          }
          componentMap = {};

          buildComponentMap(
            layoutData,
            layoutData?.sitecore.route?.placeholders,
            {
              stickyComponents: parentComponents,
              componentTags,
            }
          );

          const sitecore = layoutData?.sitecore;
          const route = sitecore?.route;
          const mode = sitecore?.context?.pageState;

          if (route) {
            const tags = evaluateTagMappings(route, routeTags);

            if (route?.itemId) {
              return {
                view: {
                  id: route.itemId,
                  name: route.name,
                  preview: mode === "preview" || mode === "edit",
                  language: route.itemLanguage,
                  version: "" + route.itemVersion,
                  tags: mapTags(tags.item),
                  personalization: getPagePersonalization(layoutData),
                },
                tags: mapTags(tags.activation),
              };
            }
          }

          return;
        }

        const addContent = (
          result: BoundaryData | undefined
        ): BoundaryData | undefined => {
          const arrayIt = (value: Content | readonly Content[] | undefined) =>
            Array.isArray(value) ? value : value ? [value] : [];
          const matchedContent = content(el);

          return !matchedContent?.length
            ? result
            : result
            ? {
                ...result,
                content: result.content
                  ? [...arrayIt(result.content), ...arrayIt(matchedContent)]
                  : matchedContent,
              }
            : { content: matchedContent };
        };

        if (componentMap) {
          const renderingUid = el.props.rendering?.uid;
          if (renderingUid) {
            return addContent(componentMap[renderingUid]);
          }
        }
        return addContent(undefined);
      }}
    >
      {children as any}
    </Tracker>
  );

  function evaluateTagMappings<T>(
    item: T,
    rules?: TagMappingRules<T>
  ): { item?: string[]; activation?: string[] } {
    const result = {};
    if (!rules) return result;

    Object.values(rules).forEach((rule) => {
      let tags = typeof rule === "function" ? rule(item) : undefined;
      if (!tags) return;
      if (typeof tags === "string") tags = [tags];

      tags.forEach((tag) => {
        if (!tag) return;
        if (typeof tag === "string") {
          tag = [tag, true];
        }
        (result[tag[1] ? "activation" : "item"] ??= []).push(
          ...tag[0].split(/\s*[,;]\s*/)
        );
      });
    });

    return result;
  }

  function buildComponentMap(
    layoutData: LayoutServiceData,
    placeholders: PlaceholdersData | undefined,
    settings: SitecoreTrackerProperties
  ) {
    if (!placeholders) return;

    const { componentTags, stickyComponents: parentComponents } = settings;
    for (const [placeholder, layout] of Object.entries(placeholders)) {
      for (const rendering of layout) {
        if ("componentName" in rendering) {
          if (!rendering.uid) continue;

          const tags = evaluateTagMappings(rendering, componentTags);

          const component = mapComponent(layoutData, rendering, tags?.item);
          const mapped = (componentMap[rendering.uid] = {
            component: { ...component, track: { promote: true } },
            area: placeholder,
            tags: mapTags(tags.activation),

            // component &&
            // (Array.isArray(parentComponents)
            //   ? parentComponents
            //   : [parentComponents]
            // ).some(
            //   (rule) =>
            //     rule &&
            //     (typeof rule === "string"
            //       ? rendering.componentName === rule
            //       : typeof rule === "function"
            //       ? rule(rendering)
            //       : rendering.componentName.match(rule))
            //),
          });

          mapped.component.instanceNumber = componentTypeCounts[
            mapped.component.id
          ] = (componentTypeCounts[mapped.component.id] ?? 0) + 1;

          buildComponentMap(layoutData, rendering.placeholders, settings);
        }
      }
    }
  }

  function normalizeUuids<T extends string | null | undefined>(text: T): T {
    return typeof text === "string"
      ? (text.replace(uuid, (m0, m1, m2, m3, m4, m5) =>
          [m1, m2, m3, m4, m5].join("-").toLowerCase()
        ) as any)
      : text;
  }

  function mapComponent(
    layoutData: LayoutServiceData,
    component: ComponentRendering,
    tags?: string[]
  ): Component {
    const mapped: Component = {
      instanceId: normalizeUuids(component.uid),
      id: component.componentName,
      name: component.componentName,
      dataSource: component.dataSource
        ? { id: normalizeUuids(component.dataSource) }
        : void 0,
      source: "sitecore",
      tags: mapTags(tags),
      personalization: getComponentPersonalization(layoutData, component),
    };

    return mapped;
  }
};
