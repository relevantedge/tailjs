import { createClientConfiguration } from "@tailjs/next";

// This file configures how properties and React components are mapped to content, components, tags etc. for tail.js.
export default createClientConfiguration({
  tracker: {
    map: (state, type, props) => {
      if (props?.component) {
        // When using a headless CMS, you typically get the page and component data, and the layout is rendered dynamically.
        // Use the properties passed to the components handling this to map to tail.js component and content data.
        return { component: { id: props.component.id ?? "unknown component" } };
      }
      if (type === "a" && props?.href) {
        return { tags: [{ name: "link", value: props?.href }] };
      }
    },
  },
});      
