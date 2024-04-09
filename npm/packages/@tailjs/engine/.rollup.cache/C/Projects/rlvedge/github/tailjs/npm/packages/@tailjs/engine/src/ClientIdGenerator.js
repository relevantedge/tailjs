export class DefaultSessionReferenceMapper {
    async mapSessionId(tracker) {
        let clientString = [
            tracker.clientIp,
            ...["accept-encoding", "accept-language", "user-agent"].map((header) => tracker.headers[header]),
        ].join("");
        return tracker.env.hash(clientString, 128);
    }
}
//# sourceMappingURL=ClientIdGenerator.js.map