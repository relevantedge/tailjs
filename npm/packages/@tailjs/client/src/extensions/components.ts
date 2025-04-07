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
  array2,
  concat,
  filter2,
  flatMap,
  forEach2,
  isString,
  join2,
  map2,
  max,
  push,
  set2,
  some,
  unshift,
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
  parseTags(el, undefined, (el) => filter2(array2(boundaryData.get(el)?.tags)));

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
        flatMap(concat(entry.component, entry.content, entry), "tags")
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
          map2(content, (content) => ({ ...content, rect: undefined })),
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
        filter2(array2(entry.component), (entry) => {
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
        unshift(
          collectedContent,
          ...map2(entry.content, (item) => ({
            ...item,
            rect,
            ...tags,
          }))
        );

      components?.length &&
        (unshift(
          collected,
          ...map2(
            components,
            (item) => (
              (includeState = max(
                includeState,
                item.track?.secondary // INV: Secondary components are only included here if we did not have any components from a child element.
                  ? IncludeState.Primary
                  : IncludeState.Promoted
              )),
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
    area && unshift(collected, area);
  });

  let areaPath: string[] | undefined;
  let components: ActivatedComponent[] | undefined;

  if (collectedContent.length) {
    // Content without a containing component is gathered in an ID-less component.
    push(collected, stripRects({ id: "", rect, content: collectedContent }));
  }

  forEach2(collected, (item) => {
    if (isString(item)) {
      push((areaPath ??= []), item);
    } else {
      item.area ??= join2(areaPath, "/");
      unshift((components ??= []), item);
    }
  });

  return components || areaPath
    ? { components: components, area: join2(areaPath, "/") }
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
            component: array2(data.component),
            content: array2(data.content),
            tags: array2(data.tags),
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
        forEach2(
          (eventData as UserInteractionEvent).components,
          (component) => {
            set2(component as any, "track", undefined);
            forEach2(
              (eventData as ComponentClickIntentEvent).clickables,
              (clickable) => set2(clickable as any, "track", undefined)
            );
          }
        );
      },
      processCommand(cmd) {
        return isDataBoundaryCommand(cmd)
          ? (registerComponent(cmd), T)
          : isScanComponentsCommand(cmd)
          ? (forEach2(
              scanAttributes(cmd.scan.attribute, cmd.scan.components),
              registerComponent
            ),
            T)
          : F;
      },
    };
  },
};
