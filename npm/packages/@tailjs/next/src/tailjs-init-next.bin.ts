import fs from "fs";
import path from "path";

const reset = "\x1b[0m";
const green = "\x1b[32;1m";
const blue = "\x1b[34m";
const flash = "\x1b[37m";

const format = (text: string, format = green) => format + text + reset;

if (process.argv.includes("--help")) {
  console.log(
    format(
      "\n@tailjs/next was installed.\n\nPlease run `npx tailjs-init-next` to setup configuration and routing.\n"
    )
  );
} else {
  let nextConfigFile: string | undefined;
  if (
    !["js", "mjs", "ts"].some((ext) =>
      fs.existsSync((nextConfigFile = "./next.config." + ext))
    )
  ) {
    console.log(
      format(
        "tail.js: No NextJS config file found in the current directory, no action taken."
      )
    );
  } else {
    console.log(
      format(
        `tailjs: Found the NextJS configuration file '${nextConfigFile!}'.\n`
      )
    );
    const prefix = fs.existsSync("src") ? "./src/" : "./";
    const apiDir = prefix + "app/api/tailjs";
    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }
    const apiConfigFile = "./tailjs.api.config.ts";
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
        `import api from "${path.posix
          .relative(apiDir, apiConfigFile)
          .slice(0, -3)}";

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
import configuration from "${path.posix
          .relative(apiDir, clientConfigFile)
          .slice(0, -3)}";

export const ConfiguredTracker = compileTracker(configuration, () => client);
`,
      ],
    ])
      try {
        if (fs.existsSync(file)) {
          console.log(
            format(
              `tail.js: ${description} ('${file}') already exists, no action taken.\n`,
              blue
            )
          );
        } else {
          fs.writeFileSync(file, content, "utf-8");
          console.log(
            format(
              `tail.js: ${description} ('${file}') was added to your project.\n`
            )
          );
        }
      } catch (e) {
        console.error(
          `tail.js: ${description} ('${file}') could not be created.\n`,
          e
        );
      }

    console.log(
      format(
        `tail.js: Configuration and routing were added.\n\nPlease remember to wrap your layout or page content in the ConfiguredTracker component ('${
          apiDir + "/ConfiguredTracker.ts"
        }').`,
        flash
      )
    );
  }
}
