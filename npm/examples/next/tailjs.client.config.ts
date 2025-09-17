import { createClientConfiguration } from "@tailjs/next";
import { Test3 } from "./src/app/components/ClientComponents";
import { ImpressionTest } from "./src/app/page";
import { BoundaryDataTag } from "@tailjs/types";

// This file configures how properties and React components are mapped to content, components, tags etc. for tail.js.
export default createClientConfiguration({
  tracker: {
    map: (state, type, props) => {
      let updates: (typeof state)[] | undefined;

      if (type === ImpressionTest) {
        (updates ??= []).push({
          components: props.tall ? undefined : [{ id: "ImpressionTest" }],
          track: { impressions: true },
        });
      }
      if (type === Test3) {
        (updates ??= []).push({
          components: [{ id: "test" }],
          track: { impressions: true },
        });
      }

      if (props.tags) {
        (updates ??= []).push({ tags: props.tags });
      }
      if (props.value?.selected) {
        (updates ??= []).push({
          tags: props.value.selected.map(
            (value: string): BoundaryDataTag => ({
              tag: "selected",
              value,
              eventType: "form",
            })
          ),
        });
      }
      if (props.componentId) {
        (updates ??= []).push({ components: [{ id: props.componentId }] });
      }
      if (props?.component) {
        // When using a headless CMS, you typically get the page and component data, and the layout is rendered dynamically.
        // Use the properties passed to the components handling this to map to tail.js component and content data.
        (updates ??= []).push({
          components: [{ id: props.component.id ?? "unknown component" }],
        });
      }

      return updates;
      //return { component: { id: "ok" + (type as any)?.name } };
    },
  },
});
