import { map2 } from "@tailjs/util";
import { ValidationErrorResult } from "./shared";

export class PostError extends Error {
  constructor(
    public readonly validation: (ValidationErrorResult & {
      sourceIndex?: number;
    })[],
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
        ...map2(extensions, (item) => `'${item[0]}' failed: ${item[1]}`),
      ].join("\n")
    );
  }
}
