import { forEach2, get2, hasKeys2, throwTypeError } from "@tailjs/util";
import {
  createRootContext,
  ParsedJsonSchemaTypeDefinition,
  parseJsonSchema,
  serializeSchema,
  sourceJsonSchemaSymbol,
} from ".";
import {
  Schema,
  SchemaAdapter,
  SchemaDefinition,
  SchemaTypeDefinition,
} from "../..";

export class JsonSchemaAdapter implements SchemaAdapter {
  rootNamespace: string | undefined;

  constructor(rootNamespace?: string) {
    this.rootNamespace = rootNamespace;
  }

  parse(source: string): SchemaDefinition[] {
    const schemaRoot = JSON.parse(source);

    const rootContext = createRootContext(schemaRoot);
    parseJsonSchema(rootContext);

    const syntheticTypes = new Map<
      string,
      {
        type: ParsedJsonSchemaTypeDefinition;
        subtypes: [string, SchemaTypeDefinition][];
      }
    >();
    for (const schema of rootContext.schemas) {
      forEach2(
        schema.types,
        ([key, type]: [
          string,
          SchemaTypeDefinition & ParsedJsonSchemaTypeDefinition
        ]) => {
          if (
            type.extends?.length === 1 &&
            !type.abstract &&
            !hasKeys2(type.properties)
          ) {
            const baseTypeId = type.extends[0] as string;
            const baseType = rootContext.types.get(baseTypeId);
            if (
              baseType?.abstract &&
              baseType[sourceJsonSchemaSymbol].schema ===
                type[sourceJsonSchemaSymbol].schema
            ) {
              get2(syntheticTypes, baseTypeId, () => ({
                type: baseType,
                subtypes: [],
              })).subtypes.push([key, type]);
            }
          }
        }
      );
    }

    for (const { type, subtypes } of syntheticTypes.values()) {
      if (subtypes.length === 1) {
        // The type is not abstract, and only have one non-abstract subtype.
        // We assume the subtype is just for the `{"additionalProperties": false}` marker.
        type.name = subtypes[0][0];
        subtypes[0][1][sourceJsonSchemaSymbol].remove();
      }
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
          schemas
        )
      : serializeSchema(schemas[0], []);
  }
}
