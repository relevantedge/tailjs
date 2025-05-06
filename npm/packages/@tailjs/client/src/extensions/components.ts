import {
  ComponentClickIntentEvent,
  type ActivatedComponent,
  type ActivatedContent,
  type ConfiguredComponent,
  type Rectangle,
  type UserInteractionEvent,
} from "@tailjs/types";
import {
  F,
  MaybeUndefined,
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
  BoundaryCommand,
  BoundaryData,
  TrackerExtensionFactory,
  isDataBoundaryCommand,
  isScanComponentsCommand,
} from "..";
import {
  NodeWithParentElement,
  boundaryData,
  createImpressionObserver,
  forAncestorsOrSelf,
  getRect,
  parseTags,
  scanAttributes,
  trackerProperty,
} from "../lib";
export type ActivatedDomComponent = ConfiguredComponent & ActivatedComponent;

export const componentDomConfiguration = Symbol("DOM configuration");

export const parseActivationTags = (el: Element) =>
  parseTags(el, undefined, (el) => filter(array(boundaryData.get(el)?.tags)));

const hasComponentOrContent = (boundary?: BoundaryData<true> | null) =>
  boundary?.component || boundary?.content;

let entry: BoundaryData<true> | undefined;
export const parseBoundaryTags = (el: Element) => {
  return parseTags(
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

export const getComponentContext = (
  el: NodeWithParentElement,
  directOnly = F,
  includeRegion?: boolean | Nullish
) => {
  let collectedContent: ActivatedContent[] = [];

  type Area = {} & string; // For clarity.
  let collected: (ActivatedDomComponent | Area)[] = [];

  let includeState = IncludeState.Secondary;
  let rect: Rectangle | undefined;

  forAncestorsOrSelf(el, (el) => {
    const entry = boundaryData.get(el);
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
                entry.track?.secondary !== T) ||
                entry.track?.promote))
          );
        }) ?? [];

      rect =
        ((includeRegion ?? some(components, (item) => item.track?.region)) &&
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
                item.track?.secondary // INV: Secondary components are only included here if we did not have any components from a child element.
                  ? IncludeState.Primary
                  : IncludeState.Promoted,
              ])),
              stripRects(
                {
                  ...item,
                  content: collectedContent.length
                    ? collectedContent
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

  if (collectedContent.length) {
    // Content without a containing component is gathered in an ID-less component.
    collected.push(stripRects({ id: "", rect, content: collectedContent }));
  }

  forEach(collected, (item) => {
    if (isString(item)) {
      (areaPath ??= []).push(item);
    } else {
      item.area ??= join(areaPath, "/");
      (components ??= []).unshift(item);
    }
  });

  return components || areaPath
    ? { components: components, area: join(areaPath, "/") }
    : undefined;
};

export const components: TrackerExtensionFactory = {
  id: "components",
  setup(tracker) {
    const impressions = createImpressionObserver(tracker);

    const normalizeBoundaryData = <T extends BoundaryData | Nullish>(
      data: T
    ): MaybeUndefined<T, BoundaryData<true>> =>
      data == null
        ? (undefined as any)
        : ({
            ...data,
            component: array(data.component),
            content: array(data.content),
            tags: array(data.tags),
          } as BoundaryData<true>);

    const registerComponent = ({
      boundary: el,
      ...command
    }: BoundaryCommand) => {
      update(boundaryData, el, (current) => {
        return normalizeBoundaryData(
          "add" in command
            ? {
                ...current,
                component: concat(current?.component, command.component),
                content: concat(current?.content, command.content),
                area: command?.area ?? current?.area,
                tags: concat(current?.tags, command.tags),
                cart: command.cart ?? current?.cart,
                track: command.track ?? current?.track,
              }
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
        return isDataBoundaryCommand(cmd)
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
