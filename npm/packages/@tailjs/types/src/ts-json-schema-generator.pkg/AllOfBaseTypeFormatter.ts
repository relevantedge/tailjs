import {
  ObjectType,
  ObjectTypeFormatter,
  TypeFormatter,
  getAllOfDefinitionReducer,
} from "ts-json-schema-generator";

/**
 * Overrides the default ObjectTypeFormatter.
 *
 * Actually, that one is more "advanced" in that it expands base types, but we want them included for code gen purposes.
 *
 * This is how it defines "inheritance" https://json-schema.org/understanding-json-schema/reference/object.html (unevaluatedProperties).
 */

export class AllOfBaseTypeFormatter extends ObjectTypeFormatter {
  private readonly _schemaId: string;

  constructor(schemaId: string | undefined, childTypeFormatter: TypeFormatter) {
    super(childTypeFormatter);
    this._schemaId = schemaId ?? "";
  }

  getDefinition(type: ObjectType) {
    const types = type.getBaseTypes();

    if (types.length === 0) {
      return this.getObjectDefinition(type);
    }
    // Split base types by those that are $reffed and those that are not.
    // Use standard behavior for non-reffable
    const baseTypes = types.map(
      (baseType) =>
        [baseType, this.childTypeFormatter.getDefinition(baseType)] as const
    );
    const reffedBaseTypes = baseTypes.filter(
      ([, typeDefinition]) =>
        typeDefinition.$ref && Object.keys(typeDefinition).length == 1
    );
    const otherBaseTypes = baseTypes.filter(
      ([, typeDefinition]) =>
        !typeDefinition.$ref || Object.keys(typeDefinition).length > 1
    );

    const mergedDefinition = otherBaseTypes
      .map(([type]) => type)
      .reduce(
        getAllOfDefinitionReducer(this.childTypeFormatter),
        this.getObjectDefinition(type)
      );

    return reffedBaseTypes.length
      ? {
          allOf: [
            ...reffedBaseTypes.map(([, typeDefinition]) => typeDefinition),
            mergedDefinition,
          ],
        }
      : mergedDefinition;
  }
}
