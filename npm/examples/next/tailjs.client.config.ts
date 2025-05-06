import { createClientConfiguration } from "@tailjs/next";

// This file configures the context for tracking.
//
// Wrap the content you want to track with the ConfiguredTracker component.
// Preferably, this should be in one of your high-level 'layout.tsx' or 'page.tsx' files.

export default createClientConfiguration({
  tracker: {
    map: (state, type, props) => {
      return { component: { id: "ok" } };
    },
  },
});
