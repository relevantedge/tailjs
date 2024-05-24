import {
  CLIENT_CALLBACK_CHANNEL_ID,
  CLIENT_STATE_CHANNEL_ID,
  INITIALIZE_TRACKER_FUNCTION,
} from "@constants";
import type { TrackerConfiguration } from "@tailjs/client";
import { Variable } from "@tailjs/types";
import { httpEncode } from "@tailjs/util/transport";
import { Tracker } from "..";

export const generateClientConfigScript = (
  config: Omit<TrackerConfiguration, "hub" | "dataTags" | "vars">
) => {
  return `((s=document.createElement("script"))=>{s.addEventListener("load",()=>window[${JSON.stringify(
    INITIALIZE_TRACKER_FUNCTION
  )}](init=>init(${JSON.stringify(
    httpEncode({ ...config, dataTags: undefined })
  )})),true);s.src=${JSON.stringify(
    config.src
  )};document.head.appendChild(s)})();`;
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
