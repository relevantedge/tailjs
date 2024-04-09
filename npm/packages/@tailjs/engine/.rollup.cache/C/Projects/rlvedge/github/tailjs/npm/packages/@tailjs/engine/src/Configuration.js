import { DEFAULT_CLIENT_CONFIG } from "@tailjs/client/external";
export const DEFAULT = {
    trackerName: "tail",
    cookies: {
        namePrefix: ".tail",
        secure: true,
    },
    allowUnknownEventTypes: true,
    debugScript: false,
    useSession: true,
    manageConsents: false,
    sessionTimeout: 30,
    deviceSessionTimeout: 10,
    includeIp: true,
    client: DEFAULT_CLIENT_CONFIG,
    clientKeySeed: "tailjs",
};
//# sourceMappingURL=Configuration.js.map