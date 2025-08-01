import { createClientConfiguration } from "@tailjs/next";
import { Test3 } from "./src/app/components/ClientComponents";
import { ImpressionTest } from "./src/app/page";

// This file configures how properties and React components are mapped to content, components, tags etc. for tail.js.
export default createClientConfiguration({
  tracker: {
    map: (state, type, props) => {
      let updates: (typeof state)[] | undefined;

      if (type === ImpressionTest) {
        console.log("IMPT");
        (updates ??= []).push({
          component: props.tall ? undefined : { id: "ImpressionTest" },
          tracking: { impressions: true },
        });
      }
      if (type === Test3) {
        (updates ??= []).push({
          component: { id: "test" },
          tracking: { impressions: true },
        });
      }

      if (props.tags) {
        (updates ??= []).push({ tags: props.tags });
      }
      if (props.value?.selected) {
        (updates ??= []).push({
          tags: {
            events: {
              form: props.value.selected.map((value: string) => ({
                tag: "selected",
                value,
              })),
            },
          },
        });
      }
      if (props.componentId) {
        (updates ??= []).push({ component: { id: props.componentId } });
      }
      if (props?.component) {
        // When using a headless CMS, you typically get the page and component data, and the layout is rendered dynamically.
        // Use the properties passed to the components handling this to map to tail.js component and content data.
        (updates ??= []).push({
          component: { id: props.component.id ?? "unknown component" },
        });
      }

      return updates;
      //return { component: { id: "ok" + (type as any)?.name } };
    },
  },
});
