import { TrackerExtension, TrackedEventBatch, Tracker } from '@tailjs/engine';

interface CdpSettings {
    clientKey: string;
    target: string;
    channel?: string;
    language?: string;
    currency?: string;
}
declare class CdpTracker implements TrackerExtension {
    readonly id = "sitecore-cdp";
    private readonly _settings;
    constructor(settings: CdpSettings);
    post(events: TrackedEventBatch, tracker: Tracker): Promise<void>;
}

export { type CdpSettings, CdpTracker };
