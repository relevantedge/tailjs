import { map } from "./lib";
export class PostError extends Error {
    validation;
    extensions;
    constructor(validation, extensions) {
        super([
            ...validation.map((item) => `The event ${JSON.stringify(item.source)} (${item.sourceIndex
                ? `source index #${item.sourceIndex}`
                : "no source index"}) is invalid: ${item.error}`),
            ...map(extensions, (item) => `'${item[0]}' failed: ${item[1]}`),
        ].join("\n"));
        this.validation = validation;
        this.extensions = extensions;
    }
}
//# sourceMappingURL=PostError.js.map