import { createClientConfiguration } from "@tailjs/next";
import Link from "next/link";

export default createClientConfiguration({
  map: ({ type, props }) => {
    // The below are just examples.
    // Configure this to match your CMS or whatever.

    if (props.componentId) {
      // Associate tracked events that happens in the context of
      // a React components that get a property called `componentId`
      // with this. (Assuming this property comes from some kind of headless CMS)
      return {
        component: { id: props.componentId },
        content: props.itemId && { id: props.itemId },
      };
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
      // Add a tag to all events that is related to content in the page's `<main>` element.
      return { tags: [{ tag: "content:area", value: "main" }] };
    }
  },
});
