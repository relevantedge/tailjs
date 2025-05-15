import {
  ComponentRendering,
  LayoutServiceData,
  PlaceholdersData,
} from "@sitecore-jss/sitecore-jss-nextjs";
import {
  BoundaryDataWithView,
  StateMapperConfiguration,
  updateState,
} from "@tailjs/react";
import { Component, Content, parseTags } from "@tailjs/types";
import {
  getComponentPersonalization,
  getPagePersonalization,
  traversePersonalization,
} from "./lib";

const UUID_REGEX =
  /\{?([a-fA-F0-9]{8})\-?([a-fA-F0-9]{4})\-?([a-fA-F0-9]{4})\-?([a-fA-F0-9]{4})\-?([a-fA-F0-9]{12})\}?/g;

export interface SitecoreJssOptions {
  debug?: boolean;
}
export const sitecoreJss = ({
  debug = false,
}: SitecoreJssOptions = {}): StateMapperConfiguration => {
  let componentMap: Record<string, BoundaryDataWithView> = {};
  let componentTypeCounts: Record<string, number> = {};

  let layoutData: LayoutServiceData | undefined;
  return (currentState, type, props) => {
    if (!props) {
      return currentState;
    }

    if (props.layoutData) {
      layoutData = props.layoutData as LayoutServiceData;
      traversePersonalization(layoutData);
      buildComponentMap(layoutData, layoutData?.sitecore.route?.placeholders);

      if (debug && typeof window !== "undefined") {
        console.groupCollapsed("SC layout data");
        console.debug(
          JSON.stringify(
            { layout: layoutData, components: componentMap },
            null,
            2
          )
        );
        console.groupEnd();
      }

      const route = layoutData.sitecore?.route;
      const mode = layoutData.sitecore?.context?.pageState;

      if (route?.itemId) {
        currentState = updateState(currentState, {
          view: {
            id: route.itemId,
            name: route.name,
            preview: mode === "preview" || mode === "edit",
            language: route.itemLanguage,
            version: "" + route.itemVersion,
            personalization: getPagePersonalization(layoutData),
            source: "sitecore",
          },
        });
      }
    }

    if (componentMap) {
      const renderingUid = normalizeUuids(props.rendering?.uid);
      if (renderingUid) {
        const componentData = componentMap[renderingUid];
        if (componentData) {
          currentState = updateState(currentState, componentData);
        }
      }
    }

    const matchedContent = content(props);
    if (matchedContent?.length) {
      currentState = updateState(currentState, {
        content: matchedContent,
      });
    }

    return currentState;
  };

  function content(props: Record<string, any>): Content[] {
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

    return (props ? [props, ...Object.values(props)] : [])
      .map((value) => {
        const { id, name, ...props } = tryFindIdContainer(value);

        return typeof id === "string" && id.match(UUID_REGEX)
          ? {
              id,
              name,
              source: "sitecore",
            }
          : undefined!;
      })
      .filter(Boolean);
  }

  function buildComponentMap(
    layoutData: LayoutServiceData,
    placeholders: PlaceholdersData | undefined
  ) {
    if (!placeholders) return;

    for (const [placeholder, layout] of Object.entries(placeholders)) {
      for (const rendering of layout) {
        if ("componentName" in rendering) {
          if (!rendering.uid) continue;

          const component = mapComponent(layoutData, rendering);
          const mapped = (componentMap[rendering.uid] = {
            component: { ...component, track: { promote: true } },
            area: placeholder,
          });

          mapped.component.instanceNumber = componentTypeCounts[
            mapped.component.id
          ] = (componentTypeCounts[mapped.component.id] ?? 0) + 1;

          buildComponentMap(layoutData, rendering.placeholders);
        }
      }
    }
  }

  function normalizeUuids<T extends string | null | undefined>(text: T): T {
    return typeof text === "string"
      ? (text.replace(UUID_REGEX, (m0, m1, m2, m3, m4, m5) =>
          [m1, m2, m3, m4, m5].join("-").toLowerCase()
        ) as any)
      : text;
  }

  function mapComponent(
    layoutData: LayoutServiceData,
    component: ComponentRendering
  ): Component {
    const tags = [
      component.fields?.["tags"],
      component.fields?.["Tags"],
      component.params?.["tags"],
      component.params?.["Tags"],
    ].flatMap((value) => {
      value = (value as any)?.value ?? value;
      return typeof value === "string" && value
        ? value.split(/&/).flatMap((tag) => parseTags(tag))
        : [];
    });

    const mapped: Component = {
      instanceId: normalizeUuids(component.uid),
      id: component.componentName,
      name: component.componentName,
      dataSource: component.dataSource
        ? { id: normalizeUuids(component.dataSource) }
        : void 0,
      source: "sitecore",
      tags: tags.length ? tags : undefined,
      personalization: getComponentPersonalization(layoutData, component),
    };

    return mapped;
  }
};
