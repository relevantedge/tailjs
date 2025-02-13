import { itemize2, throwError, throwTypeError } from "@tailjs/util";
import { createRootContext, parseJsonSchema, serializeSchema } from ".";
import { Schema, SchemaAdapter, SchemaDefinition } from "../..";

export class JsonSchemaAdapter implements SchemaAdapter {
  readonly rootNamespace: string | undefined;
  readonly restrictProperties: boolean;

  constructor(rootNamespace?: string, restrictProperties = false) {
    this.rootNamespace = rootNamespace;
    this.restrictProperties = restrictProperties;
  }

  static parse(source: any) {
    return new JsonSchemaAdapter().parse(source);
  }

  parse(source: any): SchemaDefinition[] {
    const schemaRoot = typeof source === "string" ? JSON.parse(source) : source;

    const rootContext = createRootContext(schemaRoot);
    parseJsonSchema(rootContext);
    const pending = rootContext.refs.pending();
    if (pending.length) {
      throwError(
        itemize2(
          pending,
          null,
          (refs, n) =>
            `The following $ref${n !== 1 ? "s" : ""} was not resolved: ${refs}.`
        )
      );
    }

    return rootContext.schemas;
  }

  serialize(schemas: readonly Schema[]) {
    if (!schemas.length) {
      return throwTypeError("At least one schema expected.");
    }
    if (schemas.length > 1 && !this.rootNamespace) {
      return throwTypeError(
        "If more than one schema is specified, a root namespace must be specified."
      );
    }

    return this.rootNamespace
      ? serializeSchema(
          { namespace: this.rootNamespace, types: new Map() },
          schemas,
          this.restrictProperties
        )
      : serializeSchema(schemas[0], [], this.restrictProperties);
  }
}
