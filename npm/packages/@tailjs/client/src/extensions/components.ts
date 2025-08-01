import {
  type ActivatedComponent,
  type ActivatedContent,
  type ComponentClickIntentEvent,
  type ConfiguredComponent,
  type Rectangle,
  type Tag,
  type TrackingBoundaryData,
  type UserInteractionEvent,
  getTagsForEventType,
  isEmptyTagCollection,
  normalizeTrackingData,
  uniqueTags,
  updateTrackingData,
} from "@tailjs/types";
import {
  F,
  Nullish,
  T,
  array,
  assign,
  filter,
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
} from "../lib";
export type ActivatedDomComponent = ConfiguredComponent & ActivatedComponent;

export const componentDomConfiguration = Symbol("DOM configuration");

export const parseActivationTags = (el: Element, eventType?: string) =>
  parseTags(el, undefined, (el) =>
    getTagsForEventType(boundaryData.get(el)?.tags, eventType)
  );

const hasComponentOrContent = (boundary?: TrackingBoundaryData<true> | null) =>
  boundary?.component || boundary?.content;

export const parseBoundaryTags = (
  el: NodeWithParentElement,
  eventType?: string | Nullish,
  unique = true
) => {
  const parsed = parseTags(el as Element, undefined, (parentOrSelf) => {
    return getTagsForEventType(boundaryData.get(parentOrSelf)?.tags, eventType);
  });
  if (unique && parsed.tags) {
    parsed.tags = uniqueTags(parsed.tags);
  }

  return isEmptyTagCollection(parsed?.tags) ? {} : parsed;
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

export type ComponentContext = {
  components?: ActivatedComponent[];
  content?: ActivatedContent[];
  area?: string;
  tags?: Tag[];
};

export type GetComponentContextSettings = {
  directOnly?: boolean | Nullish;
  includeRegion?: boolean | Nullish;
  eventType?: string | Nullish;
  previous?: ComponentContext & Record<keyof any, unknown>;
};

export const getComponentContext = (
  el: NodeWithParentElement,
  {
    directOnly,
    includeRegion,
    eventType,
    previous,
  }: GetComponentContextSettings = {}
): ComponentContext | undefined => {
  if (!(el as HTMLElement).isConnected) {
    return undefined;
  }

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
      entry.content &&
        collectedContent.unshift(
          ...map(entry.content, (item) => ({
            ...item,
            rect,
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
                  tracking: undefined,
                  content: collectedContent.length
                    ? uniqueContent(collectedContent)
                    : undefined,
                  rect,
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

  let tags = parseBoundaryTags(el, eventType);

  if (!tags?.tags?.length && previous?.tags) {
    // If a previous context is specified, it is probably for event diffing.
    // Include an empty tag array to tell diffing that the tags were removed.
    tags = { tags: [] };
  }

  return components || areaPath || collectedContent.length || tags.tags
    ? {
        components: components,
        area: join(areaPath, "/"),
        content:
          collectedContent.length > 0
            ? uniqueContent(collectedContent)
            : undefined,
        ...tags,
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
      update(boundaryData, el, (current) =>
        normalizeTrackingData(
          command["add"]
            ? updateTrackingData(
                current,
                assign(command, true, { add: undefined })
              )
            : "update" in command
            ? command.update(current)
            : command
        )
      );

      console.log(el, JSON.stringify(boundaryData.get(el)));

      impressions(el, boundaryData.get(el));
    };

    return {
      decorate(eventData) {
        // Strip tracking configuration.
        forEach((eventData as UserInteractionEvent).components, (component) => {
          set(component as any, "track", undefined);
          forEach(
            (eventData as ComponentClickIntentEvent).elements,
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
