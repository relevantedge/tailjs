import { forEach, isArray, isIterable, isObject } from "@tailjs/util";

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
    forEach(schema, (value) => fixReferences(value, schemaId));
    return;
  } else if (!isObject(schema)) {
    return;
  }

  if (schema.$ref?.startsWith("#")) {
    schema.$ref = schemaId + schema.$ref;
  }
  forEach(schema, ([, value]) => fixReferences(value, schemaId));
};