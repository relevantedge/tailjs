import {
  cleanBoundaryDataProperties,
  hasComponentOrContent,
  uniqueReferences,
  type ActivatedComponent,
  type ActivatedContent,
  type ComponentClickIntentEvent,
  type ConfiguredComponent,
  type Rectangle,
  type Tag,
  type UserInteractionEvent,
} from "@tailjs/types";
import {
  F,
  Nullish,
  T,
  filter,
  forEach,
  isString,
  join,
  map,
  max,
  skip,
  some,
} from "@tailjs/util";
import {
  TrackerExtensionFactory,
  TrackingBoundaryDataCommand,
  isScanComponentsCommand,
  isTrackingDataCommand,
} from "..";
import {
  NodeWithParentElement,
  createImpressionObserver,
  forAncestorsOrSelf,
  getBoundaryData,
  getBoundaryTags,
  getRect,
  scanAttributes,
  trackerFlag,
  trackerProperty,
  updateBoundaryData,
} from "../lib";
export type ActivatedDomComponent = ConfiguredComponent & ActivatedComponent;

export const componentDomConfiguration = Symbol("DOM configuration");

const parseBoundaryTags = (
  el: NodeWithParentElement,
  eventType?: string | Nullish
) => {
  const parsed = getBoundaryTags(el as Element, eventType);

  return parsed?.tags && parsed;
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
      getBoundaryData(el)?.track?.disable || trackerFlag(el, "disable");
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

  forAncestorsOrSelf(el, (el) => {
    const entry = getBoundaryData(el);
    if (!entry) {
      return;
    }

    if (hasComponentOrContent(entry)) {
      const components =
        filter(uniqueReferences(entry.components), (entry) => {
          entry &&
            (includeState === IncludeState.Secondary ||
              (!directOnly &&
                ((includeState === IncludeState.Primary &&
                  entry.track?.secondary !== T) ||
                  entry.track?.promote)));
        }) ?? [];

      rect =
        ((includeRegion ?? some(components, (item) => item.track?.region)) &&
          getRect(el)) ||
        undefined;
      entry.content &&
        collectedContent.unshift(
          ...map(entry.content, (item) =>
            item
              ? {
                  ...item,
                  rect,
                }
              : skip
          )
        );

      components?.length &&
        (collected.unshift(
          ...map(
            components,
            (item) => (
              (includeState = max([
                includeState,
                item.track?.secondary // INV: Secondary components are only included here if we did not have any components from a child element.
                  ? IncludeState.Primary
                  : IncludeState.Promoted,
              ])),
              stripRects(
                {
                  ...item,
                  track: undefined,
                  content: uniqueReferences(collectedContent),
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

  return components || areaPath || collectedContent.length || tags?.tags
    ? cleanBoundaryDataProperties(
        {
          components: uniqueReferences(components),
          area: join(areaPath, "/"),
          content:
            collectedContent.length > 0
              ? uniqueReferences(collectedContent)
              : undefined,
          ...tags,
        },
        eventType
      )
    : undefined;
};

export const components: TrackerExtensionFactory = {
  id: "components",
  setup(tracker) {
    const impressions = createImpressionObserver(tracker);

    const registerComponent = ({
      boundary: el,
      layer,
      ...command
    }: TrackingBoundaryDataCommand) => {
      const data = updateBoundaryData(
        el,
        command?.["update"] ?? command,
        layer
      );

      impressions(el, data);
    };

    return {
      decorate(eventData) {
        // Strip tracking configuration.
        forEach(
          (eventData as UserInteractionEvent).components,
          (component: any) => {
            component.track && delete component.track;
            forEach(
              (eventData as ComponentClickIntentEvent).elements,
              (clickable: any) => clickable.track && delete clickable.track
            );
          }
        );
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
