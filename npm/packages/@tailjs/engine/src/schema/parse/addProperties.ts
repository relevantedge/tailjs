import { forEach, throwError, update } from "@tailjs/util";
import {
  ParsedComposition,
  ParsedProperty,
  ParsedType,
  getRefSchema,
  getRefType,
  parseClassifications,
  parseDescription,
  parseStructure,
  parseType,
  tryParseObjectComposition,
  updateContext,
} from ".";
import { tryParsePrimitiveType } from "../..";

export const addProperties = (
  type: ParsedType,
  composition: ParsedComposition
) => {
  const node = composition.node;
  const required = new Set(node.required ?? []);

  if (composition.context && node.properties) {
    const propertiesContext = updateContext(composition.context, "properties");
    forEach(node.properties, ([key, definition]) => {
      if (type.properties?.has(key)) {
        // Already parsed.
        return;
      }

      const context = updateContext(propertiesContext, key);
      const [typeContext, structure] = parseStructure(context);

      const ownClassification = parseClassifications(context);

      // if (key === "country") {
      //   var b = 4;
      // }
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
        // Allow classifications to be undefined for now. We will try to derive them from context later.
        censorIgnore: ownClassification.censorIgnore,
        classification: ownClassification.classification!,
        purposes: ownClassification.purposes!,
        explicit: ownClassification.explicit,
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

      if (
        update(type.properties, key, (current) =>
          current != null &&
          (current.objectType ?? current.primitiveType)?.id !==
            (property.objectType ?? property.primitiveType)?.id
            ? throwError(
                "Properties in composed types must all have the same time."
              )
            : property
        )
      ) {
      }
    });
  }

  forEach(composition.compositions, (composition) =>
    addProperties(type, composition)
  );
};
