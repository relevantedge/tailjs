import {
  ImpressionEvent,
  ImpressionSummaryEvent,
  type ActivatedComponent,
  type ActivatedContent,
  type ConfiguredComponent,
  type Rectangle,
  type UserInteractionEvent,
} from "@tailjs/types";
import {
  BoundaryCommand,
  BoundaryData,
  TrackerExtensionFactory,
  getVisibleDuration,
  isDataBoundaryCommand,
  isScanComponentsCommand,
} from "..";
import {
  F,
  NodeWithParentElement,
  PendingActionHandle,
  T,
  any,
  boundaryData,
  clear,
  concat,
  del,
  filter,
  flatMap,
  forAncestorsOrSelf,
  forEach,
  get,
  getRect,
  getScreenPos,
  getViewport,
  join,
  map,
  max,
  nil,
  parseTags,
  push,
  registerViewEndAction,
  scanAttributes,
  set,
  size,
  str,
  timeout,
  timer,
  trackerConfig,
  trackerFlag,
  trackerProperty,
  undefined,
  unshift,
} from "../lib";
import { restrict } from "@tailjs/util";
export type ActivatedDomComponent = ConfiguredComponent & ActivatedComponent;

export const componentDomConfiguration = Symbol("DOM configuration");

export const parseActivationTags = (el: Element) =>
  parseTags(el, undefined, (el) => map(get(boundaryData, el)?.tags));

const hasComponentOrContent = (boundary?: BoundaryData | null) =>
  boundary?.component || boundary?.content;

let entry: BoundaryData | undefined;
export const parseBoundaryTags = (el: Element) =>
  parseTags(
    el,
    (ancestor) =>
      ancestor !== el && !!hasComponentOrContent(get(boundaryData, ancestor)),
    (el) =>
      (entry = get(boundaryData, el)) &&
      concat(
        flatMap([entry.component, entry.content], (item) =>
          flatMap(item, (item) => map(item.tags, F))
        ),
        entry.tags
      )
  );

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

const setContext = timeout();

export const getComponentContext = (
  el: NodeWithParentElement,
  directOnly = F
) => {
  clear(setContext);

  let collectedContent: ActivatedContent[] = [];

  type Area = {} & string; // For clarity.
  let collected: (ActivatedDomComponent | Area)[] = [];

  let includeState = IncludeState.Secondary;
  let rect: Rectangle | undefined;
  forAncestorsOrSelf(el, (el) => {
    const entry = get(boundaryData, el);
    if (!entry) {
      return;
    }

    if (hasComponentOrContent(entry)) {
      const components = filter(
        entry.component,
        (entry) =>
          includeState === IncludeState.Secondary ||
          (!directOnly &&
            ((includeState === IncludeState.Primary &&
              entry.track?.secondary !== T) ||
              entry.track?.promote))
      );

      rect =
        (any(components, (item) => item.track?.region) && getRect(el)) ||
        undefined;
      const tags = parseBoundaryTags(el);
      entry.content &&
        unshift(
          collectedContent,
          ...map(entry.content, (item) => ({
            ...item,
            rect,
            ...tags,
          }))
        );

      components.length &&
        (unshift(
          collected,
          ...map(
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
                  content: collectedContent,
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
    area && unshift(collected, ...map(area));
  });

  let areaPath: string[] | undefined;
  let components: ActivatedComponent[] | undefined;

  if (collectedContent.length) {
    // Content without a contaning component is gathered in an ID-less component.
    push(collected, stripRects({ id: "", rect, content: collectedContent }));
  }

  forEach(collected, (item) => {
    if (str(item)) {
      push((areaPath ??= []), item);
    } else {
      item.area ??= join(areaPath, "/");
      unshift((components ??= []), item);
    }
  });

  return components || areaPath
    ? { components: components, area: join(areaPath, "/") }
    : undefined;
};

const intersectionHandler = Symbol();
export const components: TrackerExtensionFactory = {
  id: "components",
  setup(tracker) {
    const observer = new IntersectionObserver(
      (els) =>
        forEach(
          els,
          ({ target, isIntersecting, boundingClientRect, intersectionRatio }) =>
            target[intersectionHandler]?.(
              isIntersecting,
              boundingClientRect,
              intersectionRatio
            )
        ),
      // Low thresholds used to be able to handle components larger than viewports.
      { threshold: [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75] }
    );

    function registerComponent({ boundary: el, ...command }: BoundaryCommand) {
      let update =
        "add" in command
          ? (current: BoundaryData) =>
              restrict<BoundaryData>({
                ...current,
                component: concat(current?.component, command.component),
                content: concat(current?.content, command.content),
                area: command?.area ?? current?.area,
                tags: concat(current?.tags, command.tags),
                cart: command.cart ?? current?.cart,
                track: command.track ?? current?.track,
              })
          : command["update"];

      set(boundaryData, el, update ?? command);

      let components: ConfiguredComponent[] | undefined;
      if (
        (components = filter(
          get(boundaryData, el)?.component,
          (cmp) =>
            // Impression settings from the DOM/CSS are ignorred for secondary and inferred components (performance thing)
            cmp!.track?.impressions ||
            (cmp.track?.secondary ?? cmp.inferred) !== T
        ))
      ) {
        if (!size(components)) {
          return;
        }

        let visible = F;
        let impressions = 0;
        let event: PendingActionHandle | null = nil;
        let fold: number;
        const captureState = timeout();
        const t = timer(() => getVisibleDuration(), F);

        el[intersectionHandler] = (
          intersecting: boolean,
          rect: DOMRectReadOnly,
          ratio: number
        ) => {
          intersecting =
            ratio >= 0.75 ||
            (rect.top < (fold = window.innerHeight / 2) && rect.bottom > fold);

          t(intersecting);
          if (visible !== (visible = intersecting)) {
            //el["style"].border = visible ? "2px solid blue" : "";
            if (visible) {
              captureState(() => {
                ++impressions;
                if (!event) {
                  const events = filter(
                    map(
                      components,
                      (cmp) =>
                        ((cmp!.track?.impressions ||
                          trackerFlag(
                            el,
                            "impressions",
                            T,
                            (data) => data.track?.impressions
                          )) &&
                          restrict<ImpressionEvent>({
                            type: "IMPRESSION",
                            pos: getScreenPos(el),
                            viewport: getViewport(),
                            ...getComponentContext(el, T),
                          })) ||
                        nil
                    )
                  );
                  push(tracker, ...events);

                  event = registerViewEndAction(() =>
                    push(
                      tracker,
                      ...map(
                        events,
                        (ev) =>
                          ({
                            type: "IMPRESSION_SUMMARY",
                            relatedEventId: ev.clientId,
                            duration: t(),
                            impressions: impressions - 1,
                          } as ImpressionSummaryEvent)
                      )
                    )
                  );
                }
              }, trackerConfig.impressionThreshold);
            } else {
              clear(captureState); // Not visible, clear timeout.
            }
          }
          !el.isConnected && (event?.(), (event = nil));
        };
        observer.observe(el);
      }
    }

    return {
      decorate(eventData) {
        // Strip tracking configuration.
        forEach((eventData as UserInteractionEvent).components, (component) =>
          del(component as any, "track")
        );
      },
      processCommand(cmd) {
        return isDataBoundaryCommand(cmd)
          ? (registerComponent(cmd), T)
          : isScanComponentsCommand(cmd)
          ? (map(
              scanAttributes(cmd.scan.attribute, cmd.scan.components),
              registerComponent
            ),
            T)
          : F;
      },
    };
  },
};
