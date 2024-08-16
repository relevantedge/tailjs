import { addTailJsConfiguration, createServerContext } from "@tailjs/node";
//Do not delete `import "@tailjs/engine"`, lest otherwise won't build types.d.ts.
import "@tailjs/engine";

import { NextApiHandler } from "next";
import getConfig from "next/config";

addTailJsConfiguration(
  // Adding this a function enables `setConfig` from`next/config` to be used
  // along with `addTailJsConfiguration` depending on taste.
  (current) => ({
    endpoint: "/api/tailjs",
    ...current,
    ...(typeof getConfig === "function"
      ? getConfig()
      : (getConfig as any).default?.()
    )?.serverRuntimeConfig?.tailjs,
  })
);

const { middleware, tracker } = createServerContext(
  { matchAnyPath: true },
  true
);
const api: NextApiHandler = (request, response) =>
  middleware(request, response);

export { api, tracker };
