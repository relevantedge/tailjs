import {
  BUILD_REVISION_QUERY,
  CLIENT_CALLBACK_CHANNEL_ID,
  INITIALIZE_TRACKER_FUNCTION,
} from "@constants";

import type { TrackerClientConfiguration } from "@tailjs/client";
import { createTransport, httpEncode } from "@tailjs/transport";
import { map2 } from "@tailjs/util";

export const generateClientBootstrapScript = (
  config: TrackerClientConfiguration,
  encrypt: boolean
) => {
  // Add a layer of "security by obfuscation" - just in case.

  const tempKey = "" + Math.random();
  const clientConfig = { ...config, dataTags: undefined };

  const f = `window[${JSON.stringify(INITIALIZE_TRACKER_FUNCTION)}]`;

  const scriptBlockerAttributes = config.scriptBlockerAttributes;
  // We use polling instead of attaching to the "load" event for the injected script.
  // The latter seems to get blocked by e.g. Cookiebot.
  return `((d=document,s=d.createElement("script"))=>{const poll=()=>${f}?${f}(init=>init(${JSON.stringify(
    encrypt
      ? httpEncode([tempKey, createTransport(tempKey)[0](clientConfig, true)])
      : clientConfig
  )})):setTimeout(poll,10);${
    scriptBlockerAttributes &&
    `${JSON.stringify(
      map2(scriptBlockerAttributes)
    )}.forEach(([k,v])=>s.setAttribute(k,v))`
  };s.src=${JSON.stringify(
    config.src +
      (BUILD_REVISION_QUERY
        ? (config.src.includes("?") ? "&" : "?") + BUILD_REVISION_QUERY
        : "")
  )};poll();d.head.appendChild(s)})();`;
};

export const generateClientExternalNavigationScript = (
  requestId: string,
  url: string
) => {
  // TODO: Update if we decide to change the client to use BroadcastChannel (that would be, if Chrome fixes the bf_cache issues
  // where BroadcastChannel makes the page unsalvageable)
  return `<html><head><script>try{localStorage.setItem(${JSON.stringify(
    CLIENT_CALLBACK_CHANNEL_ID
  )},${JSON.stringify(
    JSON.stringify({ requestId })
  )});localStorage.removeItem(${JSON.stringify(
    CLIENT_CALLBACK_CHANNEL_ID
  )});}catch(e){console.error(e);}location.replace(${JSON.stringify(
    url
  )});</script></head><body>(Redirecting to ${url}...)</body></html>`;
};
