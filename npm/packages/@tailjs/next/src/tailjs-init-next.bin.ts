import fs from "fs";
import path from "path";

const reset = "\x1b[0m";
const green = "\x1b[32;1m";
const blue = "\x1b[34m";
const blueBold = "\x1b[34;1m";
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
        "tail.js: No NextJS config file found in the current directory, no action taken.",
        blue
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
    const componentDir = apiDir + "/components";

    const useAt =
      fs.existsSync("tsconfig.json") &&
      fs.readFileSync("tsconfig.json").includes('"@/*":');

    for (const dir of [apiDir, componentDir]) {
      !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
    }

    const apiConfigFile = "./tailjs.api.config.ts";
    const clientConfigFile = "./tailjs.client.config.ts";
    const routeHandler = apiDir + "/route.ts";
    const componentIndex = componentDir + "/index.ts";
    const clientComponent = componentDir + "/ConfiguredTracker.client.ts";
    const serverComponent = componentDir + "/ConfiguredTracker.server.ts";

    const getImportReference = (from: string, to: string) =>
      useAt
        ? "@/" + path.posix.relative(prefix, to).replace(".ts", "")
        : path.posix.relative(from, to).replace(".ts", "");

    for (const [file, description, content] of [
      [
        apiConfigFile,
        "API configuration file",
        `import { ConsoleLogger, createApi } from "@tailjs/next/server";

export default createApi({
  debugScript: true, // Useful to see what is going on, once first installed (DISABLE IN PRODUCTION)
  json: true, // Useful to see what is sent to the server. If false, all communication is encrypted. (DISABLE IN PRODUCTION)
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
  }
});
`,
      ],
      [
        routeHandler,
        "API route handler",
        `import api from "${getImportReference(apiDir, apiConfigFile)}";

export const { GET, POST } = api;`,
      ],
      [
        clientComponent,
        "Client tracker component",
        `"use client";
import { bakeTracker } from "@tailjs/next";
import configuration from "${getImportReference(apiDir, clientConfigFile)}"

export const ConfiguredClientTracker = bakeTracker(configuration);
`,
      ],
      [
        serverComponent,
        "Server tracker component",
        `import { bakeTracker } from "@tailjs/next";
import {ConfiguredClientTracker} from "./ConfiguredTracker.client";
import configuration from "${getImportReference(apiDir, clientConfigFile)}"

export const ConfiguredTracker = bakeTracker(configuration, ConfiguredClientTracker);
`,
      ],
      [
        componentIndex,
        "Component index file",
        `export {ConfiguredClientTracker} from "./ConfiguredTracker.client";
export {ConfiguredTracker} from "./ConfiguredTracker.server";
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
              `tail.js: ${description} ('${file}') was added to your project.\n`,
              blueBold
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
        `tail.js: Configuration and routing were added.

Please remember to wrap your root layout, or specific parts you want to track, in the <ConfiguredTracker> component (import from '${getImportReference(
          ".",
          componentDir
        )}').`,
        flash
      )
    );
  }
}
