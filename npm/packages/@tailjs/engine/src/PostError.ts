import { ValidationError } from "./shared";
import { map } from "./lib";

export class PostError extends Error {
  constructor(
    public readonly validation: (ValidationError & { sourceIndex?: number })[],
    public readonly extensions: Record<string, Error>
  ) {
    super(
      [
        ...validation.map(
          (item) =>
            `The event ${JSON.stringify(item.source)} (${
              item.sourceIndex
                ? `source index #${item.sourceIndex}`
                : "no source index"
            }) is invalid: ${item.error}`
        ),
        ...map(extensions, (item) => `'${item[0]}' failed: ${item[1]}`),
      ].join("\n")
    );
  }
}
