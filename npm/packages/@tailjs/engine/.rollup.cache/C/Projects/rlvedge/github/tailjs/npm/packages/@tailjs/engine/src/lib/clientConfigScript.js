import { httpEncode } from "@tailjs/util/transport";
import { INITIALIZE_TRACKER_FUNCTION } from "@constants";
export const generateClientConfigScript = (tracker, config) => {
    delete config["dataTags"];
    return `((s=document.createElement("script"))=>{s.addEventListener("load",()=>window[${JSON.stringify(INITIALIZE_TRACKER_FUNCTION)}](init=>init(${JSON.stringify(httpEncode(config))})),true);s.src=${JSON.stringify(config.src)};document.head.appendChild(s)})();`;
};
//# sourceMappingURL=clientConfigScript.js.map