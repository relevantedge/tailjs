import {
  DataClassification,
  DataClassificationValue,
  DataPurposeValue,
  DataPurposes,
  UserConsent,
  dataClassification,
  dataPurpose,
  dataPurposes,
  validateConsent,
} from "@tailjs/types";
import {
  PickPartial,
  Wrapped,
  add,
  forEach,
  isArray,
  isDefined,
  isObject,
  isUndefined,
  map,
  required,
  toArray,
  unwrap,
  update,
} from "@tailjs/util";
import Ajv, { ErrorObject } from "ajv";
import { SchemaClassification, SchemaPropertyStructure } from "..";

export interface TraverseContext extends Partial<SchemaClassification<true>> {
  ajv: Ajv;
  id?: string;
  path: string[];
  key: string;
  $ref?: string;
  schema?: ParsedSchema;
  classification?: DataClassification;
  purposes?: DataPurposes;
  node: any;
}

export interface ParsedSchemaEntity {
  id: string;
  description?: string;
  context: TraverseContext;
  /**
   * Can be used to categorize types in documentation. Are not used for anything else.
   */
  tags?: string[];
}
export interface ParsedSchema
  extends ParsedSchemaEntity,
    Partial<SchemaClassification<true>> {
  types: Map<string, ParsedType>;
  subSchemas?: Map<string, ParsedSchema>;
}

export interface ParsedType
  extends ParsedSchemaEntity,
    Partial<SchemaClassification<true>> {
  name: string;
  declaringProperty?: ParsedProperty;
  extends?: Set<ParsedType>;
  extenders?: Set<ParsedType>;

  topLevel?: boolean;
  referencedBy?: Set<ParsedProperty>;
  properties: Map<string, ParsedProperty>;
  abstract?: boolean;
  definition: TraverseContext;
}

export interface ParsedProperty
  extends ParsedSchemaEntity,
    SchemaClassification<true> {
  name: string;
  declaringType: ParsedType;
  objectType?: ParsedType;
  structure?: SchemaPropertyStructure;
  required: boolean;

  /**
   * Ignore when censoring and calculating type classifictions.
   * If only ignored properties are left after censoring an object, it is not returned.
   *
   * The use case is common event properties such as type or session that will be in all events,
   * but it is not sensible to track an event where all its specific properties are censored.
   */
  ignore?: boolean;

  /**
   * The JSON object in the schema that defines the actual type of the property (takes maps and arrays into account.)
   */
  typeContext?: TraverseContext;
}

const parseDescription = (node: any) => ({
  description: node.description,
  tags: toArray(node["x-tags"]),
});

export const parseSchema = (schema: any, ajv: Ajv) => {
  const schemas = new Map<string, ParsedSchema>();
  const types = new Map<String, ParsedType>();

  const typeNodes = new Map<any, ParsedType>();
  const getRefType = (defaultSchema: ParsedSchema, ref: string): ParsedType => {
    if (ref.startsWith("#")) {
      ref = defaultSchema.id + ref;
    }
    const def = ajv.getSchema(ref)?.schema;
    return required(
      def && typeNodes.get(def),
      `Referenced type '${ref}' is not defined`
    ) as ParsedType;
  };

  const parseClassifications = (
    node: any,
    defaults?: Partial<SchemaClassification<true>>
  ): Partial<SchemaClassification<true>> => ({
    classification:
      dataClassification(node?.["x-privacy-class"]) ??
      (node?.["x-privacy-ignore"]
        ? DataClassification.Anonymous
        : defaults?.classification),
    purposes:
      dataPurposes(node?.["x-privacy-purposes"]) ??
      dataPurpose(node?.["x-privacy-purpose"]) ??
      (node?.["x-privacy-ignore"] ? DataPurposes.Any : defaults?.purposes),
  });

  const parseStructure = (
    context: TraverseContext
  ): [
    typeNode: TraverseContext,
    structure: SchemaPropertyStructure | undefined
  ] => {
    let structure: SchemaPropertyStructure | undefined = undefined;
    let typeContext = context;

    if (context.node.additionalProperties) {
      structure = { map: true };
      typeContext = updateContext(typeContext, "additionalProperties");
    }
    if (typeContext.node.type === "array") {
      typeContext = updateContext(typeContext, "items");

      [typeContext, (structure ??= {}).array] = parseStructure(typeContext);
      structure.array ??= true;
    }
    return [typeContext, structure];
  };

  const updateContext = (
    context: PickPartial<TraverseContext, "key">,
    key: string
  ): TraverseContext => {
    const node =
      key === "#"
        ? context.node
        : required(context.node[key], () => `Cannot navigate to '${key}'.`);
    const childContext = {
      ...context,
      key,
      ...parseClassifications(node, context),
      node,
    };
    if (node.$id) {
      childContext.$ref = node.$id + "#";
    } else if (key) {
      childContext.$ref = context.$ref + "/" + key;
    }

    childContext.path = [...context.path, key];

    if (isDefined(node.$schema)) {
      const schema = (childContext.schema = {
        id: node.$id,
        ...parseDescription(node),
        context: childContext,
        types: new Map(),
      });

      if (context.schema) {
        (context.schema.subSchemas ??= new Map()).set(schema.id, schema);
      }

      schemas.set(schema.id, schema);
    }
    return childContext;
  };

  const parseType = (
    node: any,
    context: TraverseContext,
    declaringProperty?: ParsedProperty
  ): ParsedType | undefined => {
    if (node.$id && node.$defs) {
      forEach(node.$defs, ([key, def]) => {
        const defContext = updateContext(context, "$defs");
        const type = parseType(def, updateContext(defContext, key));
        if (type) {
          defContext.schema?.types.set(type.name, type);
        }
      });
    }

    let typeContext: TraverseContext | undefined;
    if (node.type === "object") {
      typeContext = context;
    } else if (node.allOf) {
      let refIndex: number = 0;
      const nonRefs = (node.allOf as any[]).filter(
        (type, i) => ((refIndex = i), !type.$ref)
      );
      if (nonRefs.length > 1) {
        throw parseError(
          context,
          "When allOf is used for type composition, there must not be more than one item that defines an object type, and the rest must be $refs (the types that are extended)."
        );
      }
      typeContext = updateContext(
        updateContext(context, "allOf"),
        "" + refIndex
      );
    }

    if (typeContext) {
      if (typeContext.node === context.schema?.context.node) {
        throw parseError(
          context,
          "A schema definition cannot declare a root type."
        );
      }

      let name = context.key;
      let property = declaringProperty;
      while (property) {
        name =
          property.declaringType.name +
          "_" +
          property.name +
          (name !== context.key ? "_" + name : "");
        property = property.declaringType.declaringProperty!;
      }

      const type: ParsedType = {
        id: context.schema?.id! + "#" + name,
        name,
        ...parseDescription(node),
        context,
        declaringProperty,
        topLevel: !declaringProperty,
        properties: new Map(),
        definition: typeContext,
      };

      context.node.$anchor ??= type.name;

      typeNodes.set(node, type);
      types.set(type.id, type);
      return type;
    }
  };

  parseType(schema, updateContext({ ajv, path: [], node: schema }, "#"));

  typeNodes.forEach((type) => {
    if (!type.definition.node.properties) return;

    const required = new Set(type.context.node.required ?? []);
    const propertiesContext = updateContext(type.definition, "properties");
    forEach(type.definition.node.properties, ([key, definition]) => {
      const context = updateContext(propertiesContext, key);

      const [typeContext, structure] = parseStructure(context);

      let objectType = typeContext.node.$ref
        ? getRefType(context.schema!, typeContext.node.$ref)
        : undefined;

      const ownClassification = parseClassifications(definition);

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
        ignore: definition["x-privacy-ignore"],
        // Allow classifications to be undefined for now. We will try to derive them from context later.
        classification: ownClassification.classification!,
        purposes: ownClassification.purposes!,

        typeContext,
      };

      type.properties.set(key, property);
      if (typeContext.node.type === "object") {
        updateContext;
        objectType = parseType(typeContext.node, typeContext, property)!;
      }
      if ((property.objectType = objectType)) {
        (objectType.referencedBy ??= new Set()).add(property);
      }
    });
  });

  const mergeBaseProperties = (type: ParsedType, seen: Set<ParsedType>) => {
    if (!add(seen, type)) return type;

    type.extends?.forEach((baseType) =>
      forEach(
        mergeBaseProperties(baseType, seen).properties,
        ([name, property]) =>
          // Merge base property's settings on current if not overridden.
          update(type.properties, name, (current) => ({
            ...property,
            ...current,
          }))
      )
    );

    type.extends?.forEach((baseType) => {
      (baseType.extenders ??= new Set()).add(type);
    });

    return type;
  };

  const mergeBasePropertyClassifications = (
    declaringType: ParsedType,
    name: string,
    target: ParsedProperty,
    seen?: Set<ParsedType>
  ) => {
    if (
      isDefined(target.classification && target.purposes) ||
      !add((seen ??= new Set()), declaringType)
    ) {
      return;
    }

    declaringType.extends?.forEach((baseType) => {
      const baseProperty = baseType.properties.get(name);
      if (baseProperty) {
        target.classification ??= baseProperty.classification;
        target.purposes ??= baseProperty.purposes;
      }
      mergeBasePropertyClassifications(baseType, name, target, seen);
    });
  };

  const updateTypeClassifications = (
    type: ParsedType,
    seen: Set<ParsedType>
  ) => {
    if (!add(seen, type)) return type;
    // Make sure base types have classifications before their implementors.
    // This is needed to infer property classifications from base types, if properties have been overriden.
    type.extends?.forEach((type) => updateTypeClassifications(type, seen));

    const objectTypeProperties: ParsedProperty[] = [];

    forEach(type.properties, ([, property]) => {
      // Before looking classifications from the surrounding context, start by seing if a base type has property with the same name.
      // If so inherit those settings.
      mergeBasePropertyClassifications(
        property.declaringType,
        property.name,
        property
      );

      if (
        property.objectType &&
        (isUndefined(property.classification) || isUndefined(property.purposes))
      ) {
        // We do not resolve this from context, rather we look at the referenced object type.
        // (If classification is not explicitly set, we might as well use the minimum classification from the type that will not censor it away).
        objectTypeProperties.push(property);
      } else {
        // Normal properties without explicit classifications get them from the defaults at the place they are in the schema tree.
        property.classification ??= property.context.classification!;
        property.purposes ??= property.context.purposes!;
      }

      updateMinClassifications(type, property);
    });

    forEach(objectTypeProperties, (property) => {
      const type = updateTypeClassifications(property.objectType!, seen);
      property.classification ??= type.classification!;
      property.purposes ??= type.purposes!;
      updateMinClassifications(type, property);
    });

    forEach(type.properties, ([, property]) => {
      if (isUndefined(property.classification))
        throw parseError(
          property.context,
          "The property's classification is not explicitly specified and cannot be infered from scope."
        );

      if (isUndefined(property.purposes))
        throw parseError(
          property.context,
          "The property's purposes are not explicitly specified and cannot be infered from scope."
        );

      if (
        property.required &&
        !validateConsent(type as SchemaClassification, property)
      ) {
        throw parseError(
          property.context,
          "A required property cannot have a more restrictive classification than any other property in its type since a censored value without it would be invalid."
        );
      }

      updateMinClassifications(type.context.schema!, property);
    });

    return type;
  };

  const updateMinClassifications = (
    type: Partial<SchemaClassification<true>>,
    classifications: Partial<SchemaClassification<true>>
  ) => {
    if (isDefined(classifications.classification)) {
      type.classification = Math.min(
        type.classification ?? classifications.classification,
        classifications.classification
      );
    }
    if (isDefined(classifications.purposes)) {
      type.purposes = (type.purposes ?? 0) | classifications.purposes;
    }
  };

  const baseTypes = new Set<ParsedType>();
  const properties = new Set<ParsedType>();
  typeNodes.forEach((type) => {
    forEach(type.context.node.allOf, (item) => {
      const baseType = item.$ref && getRefType(type.context.schema!, item.$ref);
      if (baseType) {
        (type.extends ??= new Set()).add(baseType);
      }
    });

    mergeBaseProperties(type, baseTypes);
    updateTypeClassifications(type, properties);
  });

  // Seal concrete types.
  typeNodes.forEach((type) => {
    if (type.extenders?.size) {
      if (type.referencedBy?.size) {
        throw parseError(
          type.context,
          () =>
            `A type cannot be abstract (extended by others) and at the same time referenced by properties.
          ${""}${type.id} is both extended by ${map(
              type.extenders,
              (type) => type.id
            )?.join(", ")}, and referenced by ${map(
              type.referencedBy,
              (type) => type.id
            )?.join(", ")}`
        );
      }
      type.definition.node.unevaluatedProperties = type.abstract = true;
    } else {
      // unevaluatedProperties does not have an effect if there are no allOfs
      type.definition.node.unevaluatedProperties = false;
    }
  });

  return [schemas, types] as const;
};

const traverseValue = (
  type: ParsedType,
  structure: SchemaPropertyStructure | undefined,
  value: any,
  action: (type: ParsedType, value: any) => any
) => {
  if (structure?.map) {
    if (!isObject(value)) return undefined;
    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => [
        key,
        traverseValue(
          type,
          {
            array: structure!.array,
          },
          value,
          action
        ),
      ])
    );
  }
  if (structure?.array) {
    if (!isArray(value)) return undefined;
    structure = isObject(structure.array) ? structure.array : undefined;
    value = value
      .map((value) => traverseValue(type, structure, value, action))
      .filter((item) => item);
    return value.length ? value : undefined;
  }

  return action(type, value);
};

/**
 *  Removes all values beloning to properties that does not match the given consent.
 */
export const censor = (
  type: ParsedType,
  value: any,
  consent: SchemaClassification | UserConsent
) => {
  if (!isObject(value)) return value;

  if (!validateConsent(type as Required<SchemaClassification>, consent))
    return undefined;

  let any = false;
  const censored: any = {};

  for (const key in value) {
    const property = type.properties.get(key);
    if (!property || !validateConsent(property, consent)) {
      continue;
    }

    const propertyValue = property.objectType
      ? traverseValue(
          property.objectType,
          property.structure,
          value[key],
          (type, value) => censor(type, value, consent)
        )
      : value[key];

    if (isUndefined(propertyValue)) {
      continue;
    }

    censored[key] = propertyValue;
    if (!property.ignore) {
      any = true;
    }
  }

  return any ? censored : undefined;
};

export const parseError = (context: TraverseContext, error: Wrapped<string>) =>
  `${context.path.join("/")}: ${unwrap(error)}`;

const navigate = (value: any, path: string) =>
  path
    ?.split("/")
    .filter((item) => item)
    .reduce((current, key) => current?.[key], value);

export const validationError = (
  sourceId: string,
  errors?: ErrorObject[] | null,
  sourceValue?: any
) =>
  new Error(
    `Validation for '${sourceId}' failed${
      errors?.length
        ? ":\n" +
          errors
            .map(
              (error) =>
                ` - ${error.instancePath} ${error.message} (${map(
                  {
                    value: JSON.stringify(
                      navigate(sourceValue, error.instancePath)
                    ).slice(0, 100),
                    ...error.params,
                  },
                  ([key, value]) =>
                    (key as any) !== "type" ? `${key}: ${value}` : undefined
                ).join(", ")}).`
            )
            .join("\n")
        : "."
    }`
  );
