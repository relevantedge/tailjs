import { forEach, throwError, update } from "@tailjs/util";
import {
  ParsedComposition,
  ParsedProperty,
  ParsedType,
  getRefSchema,
  getRefType,
  normalizeBaseTypes,
  parseSchemaUsage,
  parseDescription,
  parseStructure,
  parseType,
  tryParseObjectComposition,
  updateContext,
} from ".";
import { tryParsePrimitiveType } from "..";

export const addProperties = (
  type: ParsedType,
  composition: ParsedComposition
): void => {
  const node = composition.node;
  const required = new Set(node.required ?? []);

  if (composition.context && node.properties) {
    const propertiesContext = updateContext(
      composition.context,
      "properties",
      true
    );
    forEach(node.properties, ([key, definition]) => {
      if (type.properties?.has(key)) {
        // Already parsed.
        return;
      }

      normalizeBaseTypes(definition);

      const context = updateContext(propertiesContext, key, true);
      const [typeContext, structure] = parseStructure(context);

      const ownUsage = parseSchemaUsage(context);

      // TODO: Handle obsolete properties (renames).
      // Should be in the form "oldName": {$ref: "#new-property", deprecated: true}.
      const property: ParsedProperty = {
        id: type.id + "." + key,
        name: key,
        ...parseDescription(definition),
        context,
        declaringType: type,
        required: required.has(key),
        structure,
        usage: ownUsage,
        typeContext,
      };

      let objectType: ParsedType | undefined;
      if (typeContext.node.$ref) {
        const reffed = getRefSchema(typeContext, typeContext.node.$ref);
        const primitive = tryParsePrimitiveType(reffed);
        if (primitive) {
          property.primitiveType = primitive;
        } else {
          objectType = getRefType(context, typeContext.node.$ref);
        }
      } else if (tryParseObjectComposition(typeContext.node, typeContext)) {
        objectType = parseType(typeContext.node, typeContext, property)!;
      }

      if ((property.objectType = objectType)) {
        (objectType.referencedBy ??= new Set()).add(property);
      } else {
        property.primitiveType = tryParsePrimitiveType(context.node);
      }

      property.polymorphic =
        property.objectType?.composition.compositions?.some(
          (composition) => composition.type === "oneOf"
        );

      const current = type.properties.get(key);
      type.properties.set(
        key,
        current &&
          (current.objectType ?? current.primitiveType)?.id !==
            (property.objectType ?? property.primitiveType)?.id
          ? throwError(
              "Properties in composed types must all be of the same type."
            )
          : property
      );
    });
  }

  forEach(composition.compositions, (composition) =>
    addProperties(type, composition)
  );
};
