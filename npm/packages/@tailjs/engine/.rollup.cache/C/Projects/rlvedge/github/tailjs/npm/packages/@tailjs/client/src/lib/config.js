export const isTracker = "__isTracker";
export const trackerConfig = {
    name: "tail",
    src: "/_t.js",
    disabled: false,
    postEvents: true,
    postFrequency: 2000,
    requestTimeout: 5000,
    heartbeatFrequency: 0,
    clientKey: null,
    apiKey: null,
    /**
     * Log events to the browser's developer console.
     */
    debug: false,
    impressionThreshold: 1000,
    captureContextMenu: true,
    defaultActivationTracking: "auto",
    tags: { default: ["data-id", "data-name"] },
};
//# sourceMappingURL=config.js.map