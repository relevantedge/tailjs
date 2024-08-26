import { createClientConfiguration } from "@tailjs/next";
import Link from "next/link";

// This file configures the context for tracking.
//
// Wrap the content you want to track with the ConfiguredTracker component.
// Preferably, this should be in one of your high-level 'layout.tsx' or 'page.tsx' files.

export default createClientConfiguration({
  tracker: {
    map: ({ type, props }) => {
      // The below are just examples.
      // Configure this to match your CMS or whatever.

      if (props.componentId) {
        // Associate tracked events that happens in the context of
        // a React components that get a property called 'componentId'
        // with this. (Assuming this property comes from some kind of headless CMS)
        return {
          component: { id: props.componentId },
          content: props.itemId && { id: props.itemId },
        };
      }

      if (type === "div") {
        return { component: { id: "OK" } };
      }

      if (type === Link) {
        // Track NextJS links as a special kind of components.
        // (As an example of how you can test on component types)
        return {
          component: {
            id: "next-link",
            instanceId: props.href?.href ?? props.href ?? "#",
          },
        };
      }

      if (type === "main") {
        // Add a tag to all events that is related to content in the page's '<main>' element.
        return { tags: [{ tag: "content:area", value: "main" }] };
      }
    },
  },
});
