import { trackerConfig, isTracker } from "../lib/config";
import { tail } from ".";
export function isExternal() {
    return trackerConfig.external;
}
export function configureTracker(configure) {
    const configured = typeof configure === "function" ? configure(trackerConfig) : configure;
    if (tail[isTracker]) {
        console.error("Tracker has already been initialized. Too late to configure.");
        return;
    }
    Object.assign(trackerConfig, configured);
}
//# sourceMappingURL=configureTracker.js.map