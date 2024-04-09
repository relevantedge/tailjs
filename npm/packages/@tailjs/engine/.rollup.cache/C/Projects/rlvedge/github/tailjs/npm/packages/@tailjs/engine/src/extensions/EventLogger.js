export class EventLogger {
    configuration;
    id = "event-logger";
    constructor(configuration) {
        this.configuration = configuration;
    }
    async post(events, tracker) {
        for (const ev of events.add) {
            tracker.env.log(this, {
                group: this.configuration.group,
                level: "info",
                source: this.id,
                message: ev,
            });
        }
    }
}
//# sourceMappingURL=EventLogger.js.map