import { createServerContext } from "@tailjs/node";
//Do not delete, lest won't build.
import type { Tracker } from "@tailjs/engine";
import { NextApiRequest, NextApiResponse } from "next";
import getConfig from "next/config";

const config = (
  typeof getConfig === "function" ? getConfig() : (getConfig as any).default?.()
)?.serverRuntimeConfig?.tailjs;

const { middleware, tracker, endpoint } = createServerContext({
  ...config,
  debugScript: true,
});

export const api = (req: NextApiRequest, res: NextApiResponse) => {
  // Ignore rewrites.
  req.url = req.url?.replace(/^[^?]*/, endpoint);
  return middleware(req, res);
};

export { tracker };
