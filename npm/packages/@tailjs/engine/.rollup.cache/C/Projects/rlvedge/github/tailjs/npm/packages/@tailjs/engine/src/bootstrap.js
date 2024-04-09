import defaultSchema from "@tailjs/types/schema";
import { EventParser, RequestHandler, } from "./shared";
import { map } from "./lib";
export function bootstrap({ host, endpoint, schema, cookies, extensions, allowUnknownEventTypes, crypto, encryptionKeys, useSession, debugScript, environmentTags, manageConsents, }) {
    const parser = new EventParser(schema ?? { default: defaultSchema });
    return new RequestHandler({
        host,
        parser,
        endpoint,
        cookies,
        allowUnknownEventTypes,
        extensions: map(extensions, (extension) => typeof extension === "function" ? extension : async () => extension),
        crypto,
        encryptionKeys,
        useSession,
        debugScript,
        manageConsents,
        environmentTags,
    });
}
//# sourceMappingURL=bootstrap.js.map