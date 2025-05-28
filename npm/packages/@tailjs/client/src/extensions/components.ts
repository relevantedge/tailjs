import {
  type ActivatedComponent,
  type ActivatedContent,
  type ComponentClickIntentEvent,
  type ConfiguredComponent,
  type Rectangle,
  type TrackingBoundaryData,
  type UserInteractionEvent,
  normalizeTrackingData,
  updateTrackingData,
} from "@tailjs/types";
import {
  F,
  Nullish,
  T,
  array,
  concat,
  filter,
  flatMap,
  forEach,
  isString,
  join,
  map,
  max,
  set,
  some,
  update,
} from "@tailjs/util";
import {
  TrackerExtensionFactory,
  TrackingBoundaryDataCommand,
  isScanComponentsCommand,
  isTrackingDataCommand,
} from "..";
import {
  NodeWithParentElement,
  boundaryData,
  createImpressionObserver,
  forAncestorsOrSelf,
  getBoundaryData,
  getRect,
  parseTags,
  scanAttributes,
  trackerFlag,
  trackerProperty,
  uniqueTags,
} from "../lib";
export type ActivatedDomComponent = ConfiguredComponent & ActivatedComponent;

export const componentDomConfiguration = Symbol("DOM configuration");

export const parseActivationTags = (el: Element) =>
  parseTags(el, undefined, (el) => filter(array(boundaryData.get(el)?.tags)));

const hasComponentOrContent = (boundary?: TrackingBoundaryData<true> | null) =>
  boundary?.component || boundary?.content;

let entry: TrackingBoundaryData<true> | undefined;
export const parseBoundaryTags = (el: Element, unique = true) => {
  const parsed = parseTags(
    el,
    (ancestor) =>
      ancestor !== el && !!hasComponentOrContent(boundaryData.get(ancestor)),
    (el) => {
      entry = boundaryData.get(el)!;
      return (
        (entry = boundaryData.get(el)) &&
        flatMap(
          concat(entry.component, entry.content, entry),
          (item) => item.tags,
          1
        )
      );
    }
  );
  if (unique && parsed.tags) {
    parsed.tags = uniqueTags(parsed.tags);
  }

  return parsed;
};

let content: ActivatedContent[] | undefined;
const stripRects = (
  component: ActivatedDomComponent,
  keep?: boolean
): ActivatedDomComponent =>
  keep
    ? component
    : {
        ...component,
        rect: undefined,
        content:
          (content = component.content) &&
          map(content, (content) => ({ ...content, rect: undefined })),
      };

const enum IncludeState {
  Secondary = 0,
  Primary = 1,
  Promoted = 2,
}

export const checkTrackingEnabled = (el: NodeWithParentElement | Nullish) =>
  forAncestorsOrSelf(el, (el, returnValue) => {
    let disabledSetting =
      getBoundaryData(el)?.tracking?.disable || trackerFlag(el, "disable");
    if (disabledSetting != null) {
      returnValue(disabledSetting);
    }
  }) !== true;

export const getComponentContext = (
  el: NodeWithParentElement,
  directOnly = F,
  includeRegion?: boolean | Nullish
):
  | {
      components?: ActivatedComponent[];
      content?: ActivatedContent[];
      area?: string;
    }
  | undefined => {
  let collectedContent: ActivatedContent[] = [];

  type Area = {} & string; // For clarity.
  let collected: (ActivatedDomComponent | Area)[] = [];

  let includeState = IncludeState.Secondary;
  let rect: Rectangle | undefined;

  const uniqueContent = (content: ActivatedContent[]) => {
    if (content.length <= 1) {
      return content;
    }
    const seen = new Set<string>();
    return content.filter((item) => {
      const key = item.id + item.name;
      return seen.has(key) ? false : seen.add(key);
    });
  };

  forAncestorsOrSelf(el, (el) => {
    const entry = getBoundaryData(el);
    if (!entry) {
      return;
    }

    if (hasComponentOrContent(entry)) {
      const components =
        filter(array(entry.component), (entry) => {
          return (
            includeState === IncludeState.Secondary ||
            (!directOnly &&
              ((includeState === IncludeState.Primary &&
                entry.tracking?.secondary !== T) ||
                entry.tracking?.promote))
          );
        }) ?? [];

      rect =
        ((includeRegion ?? some(components, (item) => item.tracking?.region)) &&
          getRect(el)) ||
        undefined;
      const tags = parseBoundaryTags(el);
      entry.content &&
        collectedContent.unshift(
          ...map(entry.content, (item) => ({
            ...item,
            rect,
            ...tags,
          }))
        );

      components?.length &&
        (collected.unshift(
          ...map(
            components,
            (item) => (
              (includeState = max([
                includeState,
                item.tracking?.secondary // INV: Secondary components are only included here if we did not have any components from a child element.
                  ? IncludeState.Primary
                  : IncludeState.Promoted,
              ])),
              stripRects(
                {
                  ...item,
                  content: collectedContent.length
                    ? uniqueContent(collectedContent)
                    : undefined,
                  rect,
                  ...tags,
                },
                !!rect
              )
            )
          )
        ),
        (collectedContent = []));
    }

    const area = entry.area || trackerProperty(el, "area");
    area && collected.unshift(area);
  });

  let areaPath: string[] | undefined;
  let components: ActivatedComponent[] | undefined;

  forEach(collected, (item) => {
    if (isString(item)) {
      (areaPath ??= []).push(item);
    } else {
      item.area ??= join(areaPath, "/");
      (components ??= []).unshift(item);
    }
  });

  return components || areaPath || collectedContent.length
    ? {
        components: components,
        area: join(areaPath, "/"),
        content:
          collectedContent.length > 0
            ? uniqueContent(collectedContent)
            : undefined,
      }
    : undefined;
};

export const components: TrackerExtensionFactory = {
  id: "components",
  setup(tracker) {
    const impressions = createImpressionObserver(tracker);

    const registerComponent = ({
      boundary: el,
      ...command
    }: TrackingBoundaryDataCommand) => {
      update(boundaryData, el, (current) => {
        return normalizeTrackingData(
          "add" in command
            ? updateTrackingData(current, boundaryData)
            : "update" in command
            ? command.update(current)
            : command
        );
      });

      impressions(el, boundaryData.get(el));
    };

    return {
      decorate(eventData) {
        // Strip tracking configuration.
        forEach((eventData as UserInteractionEvent).components, (component) => {
          set(component as any, "track", undefined);
          forEach(
            (eventData as ComponentClickIntentEvent).clickables,
            (clickable) => set(clickable as any, "track", undefined)
          );
        });
      },
      processCommand(cmd) {
        return isTrackingDataCommand(cmd)
          ? (registerComponent(cmd), T)
          : isScanComponentsCommand(cmd)
          ? (forEach(
              scanAttributes(cmd.scan.attribute, cmd.scan.components),
              registerComponent
            ),
            T)
          : F;
      },
    };
  },
};
