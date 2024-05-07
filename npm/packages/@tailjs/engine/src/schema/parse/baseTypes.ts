import { expand, forEach, concat, map } from "@tailjs/util";
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

    mergeBaseProperties(type, baseTypes);
    updateTypeClassifications(type, properties);
  });

  // Seal concrete types.
  typeNodes.forEach((type) => {
    // These may be defined in the source schemas (because of whatever tool was used to generate them)
    // but this constraint is always enforced via `unevaluatedProperties` anyway in the generated schema, so remove to avoid
    // unexpected errors.
    delete type.context.node.additionalProperties;
    type.context.node.type = "object";
    if (type.subtypes?.size) {
      delete type.context.node.unevaluatedProperties;
      type.abstract = true;
    } else {
      // unevaluatedProperties does not have an effect if there are no allOfs
      type.context.node.unevaluatedProperties = false;
    }
  });

  // Update all references to abstract types with a oneOf construct referencing each of its concrete types.
  // Fail if they don't all have required const property with the same name to discriminate against.
  typeNodes.forEach((type) => {
    if (type.abstract && type.referencedBy?.size) {
      const concreateSubTypes = expand(type, (type) => type.subtypes).filter(
        (type) => !type.abstract
      );

      forEach(type.referencedBy, (property) => {
        delete property.context.node.$ref;
        property.context.node.oneOf = map(concreateSubTypes, (type) => ({
          $ref: type.context.$ref,
        }));
      });

      // We let it be up to the implementors to decided how to discriminate.

      // // Collect all required const properties and their values here.
      // // There must be at least one where all the types have different values;
      // const discriminators = new Map<string, Set<string>>();

      // forEach(concreateSubTypes, (subtype) =>
      //   forEach(subtype.properties, ([, property]) => {
      //     const allowedValues = tryParsePrimitiveType(
      //       property.context.node
      //     )?.allowedValues;
      //     if (
      //       (!property.required &&
      //         !type.properties.get(property.name)?.required) ||
      //       allowedValues?.length !== 1
      //     )
      //       return;

      //     get(discriminators, property.name, () => new Set()).add(
      //       allowedValues[0]
      //     );
      //   })
      // );

      // if (
      //   some(
      //     discriminators,
      //     ([, value]) => value.size === concreateSubTypes.length
      //   )
      // ) {
      //   forEach(type.referencedBy, (property) => {
      //     delete property.context.node.$ref;
      //     property.context.node.oneOf = map(concreateSubTypes, (type) => ({
      //       $ref: type.context.$ref,
      //     }));
      //   });
      // } else {
      //   throw parseError(
      //     type.context,
      //     () =>
      //       "If an abstract type (that is, type extended by other types) is used as a property type, " +
      //       "all its subtypes must have a common property with a const value to discriminate between them.\n" +
      //       `${type.id} is extended by ${map(
      //         type.subtypes,
      //         (type) => type.id
      //       )?.join(", ")}, and referenced by ${map(
      //         type.referencedBy,
      //         (type) => type.id
      //       )?.join(", ")}`
      //   );
      // }
    }
  });
};
