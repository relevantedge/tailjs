function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class CdpTracker {
    async post(events, tracker) {
    // try {
    //   let browserRef = tracker.vars["bx_ref"]?.value;
    //   if (!browserRef) {
    //     const response = await tracker.forwardRequest({
    //       url: `https://${this._settings.target}v1.2/browser/create.json?client_key=${this._settings.clientKey}&boxever_version=1.4.8`,
    //       headers: { "x-forwarded-for": tracker.clientIp ?? "" },
    //     });
    //     browserRef = JSON.parse(response.body ?? "{}").ref;
    //     if (!browserRef) {
    //       throw new Error("No browser ref returned.");
    //     }
    //     tracker.vars["bx_ref"] = {
    //       scope: "device",
    //       essential: true,
    //       value: browserRef,
    //     };
    //   }
    //   for (const ev of events) {
    //     const url = `https://${
    //       this._settings.target
    //     }v1.2/event/create.json?client_key=${
    //       this._settings.clientKey
    //     }&boxever_version=1.4.8&message=${encodeURIComponent(
    //       JSON.stringify({
    //         browser_id: browserRef,
    //         channel: this._settings.channel,
    //         type: ev.type,
    //         language: this._settings.language,
    //         currency: this._settings.currency,
    //         ext: ev,
    //       })
    //     )}`;
    //     const eventResponse = await tracker.forwardRequest({
    //       url,
    //       method: "POST",
    //     });
    //     await env.log({
    //       group: this.id,
    //       level: "info",
    //       source: this.id,
    //       data: JSON.stringify([url, browserRef, eventResponse.body]),
    //     });
    //   }
    // } catch (e) {
    //   await env.log({
    //     group: this.id,
    //     level: "error",
    //     source: this.id,
    //     data: "" + e,
    //   });
    // }
    }
    constructor(settings){
        _define_property(this, "id", "sitecore-cdp");
        _define_property(this, "_settings", void 0);
        this._settings = {
            channel: "WEB",
            language: "EN",
            currency: "EUR",
            ...settings,
            target: settings.target.endsWith("/") ? settings.target : `${settings.target}/`
        };
    }
}

export { CdpTracker };
