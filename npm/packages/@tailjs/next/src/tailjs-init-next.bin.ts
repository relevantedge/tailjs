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

    const useAt =
      fs.existsSync("tsconfig.json") &&
      fs.readFileSync("tsconfig.json").includes('"@/*":');

    for (const dir of [apiDir]) {
      !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
    }

    const apiConfigFile = "./tailjs.api.config.ts";
    const clientConfigFile = "./tailjs.client.config.ts";
    const routeHandler = apiDir + "/route.ts";

    const getImportReference = (from: string, to: string) =>
      useAt
        ? "@/" + path.posix.relative(prefix, to).replace(".ts", "")
        : path.posix.relative(from, to).replace(".ts", "");

    for (const [file, description, content] of [
      [
        apiConfigFile,
        "API configuration file",
        `import {DefaultLogger} from "@tailjs/node";
import { ConsoleLogger, createApi } from "@tailjs/next/server";

export default createApi({
  debugScript: true, // Useful to see what is going on, once first installed (DISABLE IN PRODUCTION)
  json: true, // Useful to see what is sent to the server. If false, all communication is encrypted. (DISABLE IN PRODUCTION)
  extensions: [new ConsoleLogger()], // Add extensions here to store data etc.
  logger: new DefaultLogger({
      basePath: false,
      console: "error",
    }),
  resourcesPath: "./tmp",
});
`,
      ],
      [
        clientConfigFile,
        "Client configuration file",
        `import { createClientConfiguration } from "@tailjs/next";

// This file configures how properties and React components are mapped to content, components, tags etc. for tail.js.
export default createClientConfiguration({
  tracker: {
    map: (state, type, props) => {
      if (props?.componentData) {        
        // Inspect the properties passed to the components and map to tail.js component, content, tag data etc.
        // For example, when using a headless CMS the page, layout and component data are typically mapped to properties in structured form.
        return { component: { id: props.componentData.id ?? "unknown component" } };
      }
    },
  },
});      
`,
      ],
      [
        routeHandler,
        "API route handler",
        `import api from "${getImportReference(apiDir, apiConfigFile)}";

export const { GET, POST } = api;`,
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
Please remember to update the 'map' function in 'tailjs.client.config.ts'

Also update you next.config to include the TailJsPlugin from '@tailjs/react/webpack':
  webpack: (config) => {
    // ...any existing configuration you may have.
    config.plugins = [...(config.plugins ?? []), new TailJsPlugin()];
    return config;
  }

Please note that @tailjs does currently NOT support turbopack, so you have to use webpack.`,
        flash
      )
    );
  }
}
