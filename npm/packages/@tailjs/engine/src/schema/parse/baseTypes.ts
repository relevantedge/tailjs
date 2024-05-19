import { concat, expand, merge } from "@tailjs/util";
import {
  ParsedComposition,
  ParsedType,
  TraverseContext,
  getRefType,
  mergeBaseProperties,
  updateTypeClassifications,
} from ".";

export const updateBaseTypes = (context: TraverseContext) => {
  const baseTypes = new Set<ParsedType>();
  const properties = new Set<ParsedType>();
  const typeNodes = context.parseContext.typeNodes;
  typeNodes.forEach((type) => {
    const addBaseTypes = (composition: ParsedComposition) => {
      if (composition.context) {
        const baseType = getRefType(composition.context, composition.ref?.id);
        if (baseType) {
          (type.extends ??= new Set()).add(baseType);
        }
        concat(composition.compositions, composition.ref?.composition)?.forEach(
          addBaseTypes
        );

        if (type.extends) {
          type.extendsAll = new Set(expand(type, (type) => type.extends));
        }
      }
    };

    addBaseTypes(type.composition);
  });

  typeNodes.forEach((type) => {
    mergeBaseProperties(type, baseTypes);
    updateTypeClassifications(type, properties);
  });

  // Restrict all type not to have unknown properties by adding `unevaluatedProperties: false`.
  // Adding this property to types that are used in compositions by other types (e.g. allOf) will break validation,
  // so the property can only be added directly to leaf types.
  //
  // If non-leaf types are used directly as property types their references must be turned into anonymous object types
  // where the `unevaluatedProperties` is added.

  typeNodes.forEach((type) => {
    // Remove property restrictions from the source schemas added by whatever tool that was used to generate them.
    // The same restriction will still be enforced, yet it need to be rewritten to support dependencies between schemas.
    delete type.context.node.additionalProperties;
    delete type.context.node.unevaluatedProperties;

    type.context.node.type = "object";
    if (type.subtypes?.size) {
      if (!type.referencedBy?.size) {
        // The type is abstract. It is used in compositions and not used directly.
        type.abstract = true;
      } else {
        type.referencedBy?.forEach((property) => {
          merge(property.context.node, {
            type: "object",
            unevaluatedProperties: false,
          });
        });
      }
    } else {
      // unevaluatedProperties does not have an effect if there are no allOfs
      type.context.node.unevaluatedProperties = false;
    }
  });
};
