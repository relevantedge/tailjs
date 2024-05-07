import { INITIALIZE_TRACKER_FUNCTION } from "@constants";
import type { TrackerConfiguration } from "@tailjs/client";
import { httpEncode } from "@tailjs/util/transport";

export const generateClientConfigScript = (
  config: Omit<TrackerConfiguration, "hub" | "dataTags" | "vars">
) => {
  delete config["dataTags"];
  return `((s=document.createElement("script"))=>{s.addEventListener("load",()=>window[${JSON.stringify(
    INITIALIZE_TRACKER_FUNCTION
  )}](init=>init(${JSON.stringify(
    httpEncode(config)
  )})),true);s.src=${JSON.stringify(
    config.src
  )};document.head.appendChild(s)})();`;
};
