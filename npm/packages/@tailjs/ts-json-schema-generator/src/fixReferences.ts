import { forEach2, isArray, isPlainObject } from "@tailjs/util";

/**
 * If a type has an ID (via the @ id annotation), relatively referenced types under it are resolved against the type's node,
 * and not the schema as the generated schema assumes.
 *
 * This function fixes it.
 *
 * Example: `{ $schema: "...", $id: "schema", $defs: {Type1: {$id: "type1", properties: {test: {$ref: "#/$defs/Type2"}}, {Type2: {...}}}}}`
 */
export const fixReferences = (
  schema: any,
  schemaId: string = schema.$id ?? ""
) => {
  if (isArray(schema)) {
    forEach2(schema, (value) => fixReferences(value, schemaId));
    return;
  } else if (!isPlainObject(schema)) {
    return;
  }

  if (schema.$ref?.startsWith("#")) {
    (schema as any).$ref = schemaId + schema.$ref;
  }
  forEach2(schema, ([, value]) => fixReferences(value, schemaId));
};
