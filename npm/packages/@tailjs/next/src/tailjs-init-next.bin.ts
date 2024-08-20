import fs from "fs";
import path from "path";

let nextConfigFile: string | undefined;
if (
  !["js", "mjs", "ts"].some((ext) =>
    fs.existsSync((nextConfigFile = "./next.config." + ext))
  )
) {
  console.log(
    "tail.js: No NextJS config file found in the current directory, no action taken."
  );
} else {
  console.log(
    `tailjs: Found the NextJS configuration file '${nextConfigFile!}'.`
  );
  const prefix = fs.existsSync("src") ? "./src/" : "./";
  const apiDir = prefix + "api/tailjs";
  const apiConfigFile = "./tailjs.client.api.ts";
  const clientConfigFile = "./tailjs.client.config.ts";

  for (const [file, description, content] of [
    [
      apiConfigFile,
      "API configuration file",
      `import { ConsoleLogger, createApi } from "@tailjs/next/server";

export default createApi({
  debugScript: true, // Useful to see what is going on, once first installed.
  extensions: [new ConsoleLogger()], // Add extensions here to store data etc.
});
`,
    ],
    [
      clientConfigFile,
      "Client configuration file",
      `import { createClientConfiguration } from "@tailjs/next";
import Link from "next/link";

// This file configures the context for tracking.
//
// Wrap the content you want to track with the ConfiguredTracker component.
// Preferably, this should be in one of your high-level 'layout.tsx' or 'page.tsx' files.

export default createClientConfiguration({
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
});
`,
    ],
    [
      apiDir + "/route.ts",
      "API route handler",
      `import api from "${path.posix.relative(apiDir, apiConfigFile)}";

export const { GET, POST } = api;`,
    ],
    [
      apiDir + "/_client.ts",
      "Boilerplate for the tracking component.",
      `"use client";
import { ConfiguredTracker as _client_tracker } from "./ConfiguredTracker";
export default _client_tracker;
`,
    ],
    [
      apiDir + "/ConfiguredTracker.ts",
      "The tracking component",
      `import { compileTracker } from "@tailjs/next";
import client from "./_client";
import configuration from "${path.posix.relative(apiDir, clientConfigFile)}";

export const ConfiguredTracker = compileTracker(configuration, () => client);
`,
    ],
  ])
    try {
      if (fs.existsSync(file)) {
        console.log(`tail.js: '${file}' already exists, no action taken.`);
      } else {
        fs.writeFileSync(file, content, "utf-8");
        console.log(`tail.js: '${file}' was added to the project.`);
      }
    } catch (e) {
      console.error(
        `tail.js: The file '${file}' for the tail.js API route could be created.`,
        e
      );
    }
}
