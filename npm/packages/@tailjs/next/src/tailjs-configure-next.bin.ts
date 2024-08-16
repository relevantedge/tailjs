import fs from "fs";

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
  const apiDir = prefix + "pages/api";
  const apiFile = apiDir + "/tailjs.ts";
  const configFile = "./tailjs.config.ts";

  try {
    if (fs.existsSync(configFile)) {
      console.log(`tail.js: '${configFile}' already exists, no action taken.`);
    } else {
      fs.writeFileSync(
        configFile,
        `import { TailJsApiConfiguration, TailJsConsoleLogger } from "@tailjs/next";

export default async (): Promise<TailJsApiConfiguration> => ({
  // Tail.js configuration settings
  debugScript: true,  
  extensions: [new TailJsConsoleLogger()],
});
`,
        "utf-8"
      );
      console.log(
        `tail.js: '${configFile}' was added to the root of the project.`
      );
    }
    if (fs.existsSync(apiFile)) {
      console.log(`tail.js: '${apiFile}' already exists, no action taken.`);
    } else {
      fs.mkdirSync(apiDir, { recursive: true });
      fs.writeFileSync(
        apiDir + "/tailjs.ts",
        `/\x2a 
 * The API route handler for tail.js.
 * This file is auto-generated and should not be edited directly         
 *
 * You are encouraged, but not required, to add a rewrite to make this
 * endpoint follow standard conventions by merging the bellow settings
 * into your '${nextConfigFile!}' configuration file: 
   
  {    
    env: {
      NEXT_PUBLIC_TAILJS_API: "/_t.js",
    },
    rewrites: () => [
      {
        source: "/_t.js",
        destination: "/api/tailjs",
      },
    ],
  }
 
 */

export { api } from "@tailjs/next";
`,
        "utf-8"
      );

      console.log(`tail.js: Configured the tail.js API route in ${apiFile}'.`);
    }
  } catch (e) {
    console.error(
      `tail.js: The file '${apiFile}' for the tail.js API route could be created.`,
      e
    );
  }
}
