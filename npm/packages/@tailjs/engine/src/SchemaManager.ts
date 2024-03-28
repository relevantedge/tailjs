import {
  DataClassification,
  DataPurposes,
  VariableScopeValue,
  dataClassification,
  dataPurpose,
  dataPurposes,
  validateConsent,
  variableScope,
} from "@tailjs/types";
import {
  add,
  assign,
  forEach,
  isArray,
  isDefined,
  isObject,
  isUndefined,
  obj,
  required,
} from "@tailjs/util";
import Ajv from "ajv";

const ids = {
  TrackedEvent: "urn:tailjs:core#TrackedEvent",
};

interface Classication {
  classification: DataClassification;
  purposes: DataPurposes;
}

export type SchemaPropertyStructure = {
  map?: boolean;
  array?: boolean | SchemaPropertyStructure;
};

export interface SchemaItem extends Classication {
  id: string;
}

export interface Schema extends SchemaItem {
  parent?: Schema;
  events?: ReadonlyMap<string, SchemaType>;
  variables?: {
    [P in VariableScopeValue<false>]?: ReadonlyMap<string, SchemaProperty>;
  };
  types: ReadonlyMap<string, SchemaType>;

  subSchemas: ReadonlyMap<string, Schema>;
}

export type CensorFunction<T = any> = (
  value: T,
  consent: Classication
) => T | undefined;

export interface SchemaType<T = any> extends SchemaItem {
  name: string;
  schema?: Schema;
  primitive?: boolean;
  properties?: ReadonlyMap<string, SchemaProperty>;
  extends?: ReadonlyMap<string, SchemaType>;

  censor?: CensorFunction;
  validate?(source: T): T;
}

export interface SchemaProperty<T = any> extends SchemaItem {
  name: string;
  declaringType: SchemaType;
  type: SchemaType;
  structure?: SchemaPropertyStructure;
}

const primitiveShared: Pick<
  SchemaType,
  "classification" | "purposes" | "primitive"
> = {
  classification: DataClassification.Anonymous,
  purposes: DataPurposes.Any,
  primitive: true,
};

export const primitives = {
  boolean: {
    id: "#boolean",
    name: "boolean",
    ...primitiveShared,
  } as SchemaType,
  integer: {
    id: "#integer",
    name: "integer",
    ...primitiveShared,
  } as SchemaType,
  number: {
    id: "#number",
    name: "number",
    ...primitiveShared,
  } as SchemaType,
  string: {
    id: "#string",
    name: "string",
    ...primitiveShared,
  },
  date: {
    id: "#date",
    name: "datetime",
    ...primitiveShared,
  } as SchemaType,
  time: {
    id: "#time",
    name: "time",
    ...primitiveShared,
  } as SchemaType,
  duration: {
    id: "#duration",
    name: "duration",
    ...primitiveShared,
  } as SchemaType,
  datetime: {
    id: "#datetime",
    name: "datetime",
    ...primitiveShared,
  } as SchemaType,
  uuid: {
    id: "#uuid",
    name: "uuid",
    ...primitiveShared,
  } as SchemaType,
};

const tryParsePrimitiveType = (schemaProperty: any) => {
  switch (schemaProperty?.type) {
    case "integer":
      return primitives.integer;
    case "number":
      return primitives.number;
    case "string":
      switch (schemaProperty.format) {
        case "date":
          return primitives.date;
        case "date-time":
          return primitives.datetime;
        case "time":
          return primitives.time;
        case "duration":
          return primitives.duration;
        case "uuid":
          return primitives.uuid;
        default:
          return primitives.string;
      }
    default:
      return undefined;
  }
};

interface TraverseContext extends Partial<Classication> {
  ajv: Ajv;
  id?: string;
  path: string[];
  $ref?: string;
  schema?: ParsedSchema;
  classification?: DataClassification;
  purposes?: DataPurposes;
  node?: any;
}

interface ParsedSchema extends Partial<Classication> {
  id: string;
  context: TraverseContext;
  types: Map<string, ParsedType>;
  subSchemas?: Map<string, ParsedSchema>;
}

interface ParsedType extends Partial<Classication> {
  id: string;
  name: string;
  context: TraverseContext;
  declaringProperty?: ParsedProperty;
  extends?: Set<ParsedType>;
  implementors?: Set<ParsedType>;
  properties: Map<string, ParsedProperty>;
}

interface ParsedProperty extends Classication {
  id: string;
  name: string;
  context: TraverseContext;
  declaringType: ParsedType;
  objectType?: ParsedType;
  structure?: SchemaPropertyStructure;

  /** Ignore when censoring and calculating type classifictions.
   * If only ignored properties are left after censoring an object, it is not returned.
   */
  ignore?: boolean;

  /**
   * The JSON object in the schema that defines the actual type of the property (takes maps and arrays into account.)
   */
  typeNode?: any;
}

export class SchemaManager {
  private readonly _ajv: Ajv;

  public readonly schemas: ReadonlyMap<string, Schema> = new Map();
  public readonly types: ReadonlyMap<string, SchemaType> = new Map();

  constructor(schemas: any[]) {
    const schemaCollection = {
      $id: "urn:tailjs:runtime",
      $defs: obj(schemas, (schema) => [
        required(schema.$id, "A schema must have an $id property."),
        schema,
      ]),
    };

    this._ajv = new Ajv()
      .addKeyword("x-privacy-class")
      .addKeyword("x-privacy-purpose")
      .addKeyword("x-privacy-purposes")
      .addKeyword("x-privacy-ignore");

    this._ajv.compile(schemaCollection);

    const [parsedSchemas, parsedTypes] = parse(schemaCollection, this._ajv);
    const typeMap = new Map<ParsedType, SchemaType>();

    parsedSchemas.forEach((parsed) => {
      const schema: Schema = {
        id: parsed.id,
        classification: parsed.classification!,
        purposes: parsed.purposes!,
        types: new Map(),
        subSchemas: new Map(),
      };

      (this.schemas as Map<any, any>).set(schema.id, schema);
    });

    parsedSchemas.forEach((parsed) => {
      const schema = this.schemas.get(parsed.id)!;
      forEach(parsed.subSchemas, ([, parsedSubSchema]) => {
        const subSchema = required(this.schemas.get(parsedSubSchema.id));
        subSchema.parent = schema;
        (schema.subSchemas as Map<string, Schema>).set(subSchema.id, subSchema);
      });
    });

    parsedTypes.forEach((parsed) => {
      const type: SchemaType = {
        id: parsed.context.schema!.id + "#" + parsed.name,
        name: parsed.name,
        classification: parsed.classification!,
        purposes: parsed.purposes!,
        primitive: false,
        schema: this.schemas.get(parsed.context.schema!.id),
      };
      typeMap.set(parsed, type);
      (this.types as Map<any, any>).set(type.id, type);

      if (parsed.context.schema!.types.has(type.name)) {
        // The type is defined in the schema's $def section (as opposed to anonymous types defined directly in properties).
        // Only these types support validation and censoring through the public API.

        const validate = required(
          this._ajv.getSchema(parsed.context.$ref!),
          () =>
            `INV <> The ref '${parsed.context.$ref}' does not address the type '${type.id}' in the schema.`
        );
        type.validate = (value) => {
          if (!validate(value)) {
            throw new Error(
              `Validation for the type '${type.id}' failed${
                validate.errors
                  ? ": " +
                    this._ajv.errorsText(validate.errors, {
                      separator: "  \n",
                    })
                  : "."
              }`
            );
          }
          return value;
        };

        type.censor = (value, classification) =>
          censor(parsed, value, classification);
      }
    });

    parsedTypes.forEach((parsed) => {
      const type = typeMap.get(parsed)!;
      forEach(parsed.extends, (parsedBaseType) => {
        const baseType = required(typeMap.get(parsedBaseType), "Base type...");
        ((type.extends ??= new Map()) as Map<string, SchemaType>).set(
          baseType.id,
          baseType
        );
      });
      forEach(parsed.properties, ([key, parsedProperty]) => {
        const property: SchemaProperty = {
          id: type + "#" + key,
          name: parsedProperty.name,
          classification: parsedProperty.classification,
          purposes: parsedProperty.purposes,
          declaringType: type,
          structure: parsedProperty.structure,
          type: required(
            parsedProperty.objectType
              ? typeMap.get(parsedProperty.objectType)
              : tryParsePrimitiveType(parsedProperty.typeNode),
            contextError(parsed.context, "Unknown property type.")
          ),
        };
        ((type.properties ??= new Map()) as Map<string, SchemaProperty>).set(
          property.name,
          property
        );
        if (
          key === "type" &&
          parsedProperty.typeNode?.const &&
          type.extends?.has(ids.TrackedEvent)
        ) {
          ((type.schema!.events ??= new Map()) as Map<string, SchemaType>).set(
            parsedProperty.typeNode?.const,
            type
          );
        }

        if (type.name.startsWith("scope:")) {
          // Remove surrogate type for scope variables from schema and add to variables instead.
          const scopeId = variableScope.lookup(type.name.substring(6));
          (type.schema!.types as Map<string, SchemaType>).delete(type.id);
          assign(
            ((type.schema!.variables ??= {})[scopeId] ??= new Map()) as Map<
              string,
              SchemaProperty
            >,
            type.properties
          );
        }
      });
    });

    // Push nested schema types and events to parent schema. At the same time validate that event type IDs are unique.
    //
    // Also, don't push variables since those are scoped to their schema IDs. It is not sensible to detect variable name clashes
    // at the global level since prefixed variable storages may only use a subset of the schema.
    // Hence, it is their responsibility to merge their respective schemas and check for name clashes.
    this.schemas.forEach((schema) => {
      let parent = schema.parent;
      while (parent) {
        schema.events?.forEach((event, key) => {
          if (parent!.events?.has(key)) {
            throw new Error(
              `The events '${parent!.events!.get(key)!.id}' and '${
                event.id
              }' cannot both have the type name '${key}'.`
            );
          }
          ((parent!.events ??= new Map()) as Map<string, SchemaType>).set(
            key,
            event
          );
        });
        schema.types.forEach((type) => {
          (parent!.types as Map<string, SchemaType>).set(type.id, type);
        });
        parent = parent.parent;
      }
    });
  }

  public validate<T>(typeId: string, value: T) {
    return (
      required(
        this.types.get(typeId),
        () => `The type '${typeId}' is not defined.`
      ).validate?.(value) ?? value
    );
  }

  public censor<T>(
    typeId: string,
    value: T,
    classification: Classication
  ): T | undefined {
    return required(
      required(
        this.types.get(typeId),
        () => `The type '${typeId}' is not defined.`
      ).censor,
      () =>
        `The type '${typeId}' is not a top-level type, hence it does not have the logic to censor values..`
    )(value, classification);
  }
}

const parse = (schema: any, ajv: Ajv) => {
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
    defaults?: Partial<Classication>
  ): Partial<Classication> => ({
    classification:
      dataClassification(node?.["x-privacy-class"]) ?? defaults?.classification,
    purposes:
      dataPurposes(node?.["x-privacy-purposes"]) ??
      dataPurpose(node?.["x-privacy-purpose"]) ??
      defaults?.purposes,
  });

  const updateContext = (
    context: TraverseContext,
    node: any,
    key?: string
  ): TraverseContext => {
    const childContext = {
      ...context,
      ...parseClassifications(node, context),
      node,
    };
    if (isDefined(node.$id && (node.$schema || node.$defs))) {
      const schema = (childContext.schema = {
        id: node.$id,
        context: childContext,
        types: new Map(),
      });

      if (context.schema) {
        (context.schema.subSchemas ??= new Map()).set(schema.id, schema);
      }
      childContext.path = [node.$id];
      childContext.$ref = node.$id + "#";

      schemas.set(schema.id, schema);
    } else if (key) {
      childContext.path = [...context.path, key];
      childContext.$ref = context.$ref + "/" + key;
    }
    return childContext;
  };

  const parseTypes = (
    node: any,
    context: TraverseContext,
    key?: string
  ): ParsedType | undefined => {
    context = updateContext(context, node, key);

    if (node.$id && node.$defs) {
      forEach(node.$defs, ([key, def]) => {
        const defContext = updateContext(context, def, "$defs");
        const type = parseTypes(def, defContext, key);
        if (type) {
          defContext.schema?.types.set(type.name, type);
        }
      });
    }

    if (node.type === "object") {
      if (node === context.schema?.context.node) {
        throw contextError(
          context,
          "A schema definition cannot declare a root type."
        )();
      }
      const type: ParsedType = {
        id: context.schema?.id! + "#" + key!,
        name: key!,
        context,
        properties: new Map(),
      };

      typeNodes.set(node, type);
      types.set(type.id, type);
      return type;
    }
  };

  parseTypes(schema, { ajv, path: [] });

  typeNodes.forEach((type) => {
    forEach(type.context.node.properties, ([key, definition]) => {
      const context = updateContext(type.context, definition, key);

      let typeNode = definition;
      const parseStructure = (definition: any) => {
        let structure: SchemaPropertyStructure | undefined = undefined;
        if (definition.additionalProperties) {
          structure = { map: true };
          typeNode = definition.additionalProperties;
        }
        if (typeNode.type === "array") {
          typeNode = typeNode.items;

          (structure ??= {}).array = parseStructure(typeNode) ?? true;
        }
        return structure;
      };

      let objectType = typeNode.$ref
        ? getRefType(context.schema!, definition.$ref)
        : undefined;

      const ownClassification = parseClassifications(definition);

      const property: ParsedProperty = {
        id: type.id + "." + key,
        name: key,
        context,
        declaringType: type,
        structure: parseStructure(definition),
        // Leave properties that references types undefined for now.
        // They will be inferred from context and the referenced type later, state invariants are preserved when the function returns
        classification:
          ownClassification.classification ??
          (objectType ? undefined : context.classification)!,
        purposes:
          ownClassification.purposes ??
          (objectType ? undefined : context.purposes)!,
        typeNode,
      };

      type.properties.set(key, property);
      if (typeNode.type === "object") {
        objectType = parseTypes(typeNode, context, key)!;
        type.declaringProperty = property;
        type.name = key;
        let parent = property;
        while (parent) {
          type.name =
            parent.declaringType.name + "_" + property.name + "_" + type.name;
          parent = property.declaringType.declaringProperty!;
        }
      }
      property.objectType = objectType;
    });
  });

  const mergeBaseProperties = (type: ParsedType, seen: Set<ParsedType>) => {
    if (!add(seen, type)) return type;

    type.extends?.forEach((baseType) =>
      forEach(
        mergeBaseProperties(baseType, seen).properties,
        ([name, property]) =>
          !type.properties.has(name) && type.properties.set(name, property)
      )
    );

    type.extends?.forEach((baseType) => {
      (baseType.implementors ??= new Set()).add(type);
      baseType.extends?.forEach((baseBaseType) => {
        type.extends!.add(baseBaseType);
        (baseBaseType.implementors ??= new Set()).add(type);
      });
    });

    return type;
  };

  const updateTypeClassifications = (
    type: ParsedType,
    seen: Set<ParsedType>
  ) => {
    if (!add(seen, type)) return type;

    const objectTypeProperties: ParsedProperty[] = [];

    forEach(type.properties, ([, property]) => {
      if (property.ignore) {
        // Ignore those.
        return;
      }
      updateMinClassifications(type, property);
      if (
        property.objectType &&
        (isUndefined(property.classification) || isUndefined(property.purposes))
      ) {
        objectTypeProperties.push(property);
      }
    });

    forEach(objectTypeProperties, (property) => {
      const type = updateTypeClassifications(property.objectType!, seen);
      property.classification ??= type.classification!;
      property.purposes ??= type.purposes!;
      updateMinClassifications(type, property);
    });

    forEach(type.properties, ([, property]) => {
      if (isUndefined(property.classification))
        throw contextError(
          property.context,
          "The classification is not explicitly specified and cannot be infered from scope."
        )();

      if (isUndefined(property.purposes))
        throw contextError(
          property.context,
          "The classification is not explicitly specified and cannot be infered from scope."
        )();

      updateMinClassifications(type.context.schema!, property);
    });

    return type;
  };

  const updateMinClassifications = (
    type: Partial<Classication>,
    classifications: Partial<Classication>
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
      const baseType = getRefType(type.context.schema!, item.$ref);
      if (baseType) {
        (type.extends ??= new Set()).add(baseType);
      }
    });

    mergeBaseProperties(type, baseTypes);
    updateTypeClassifications(type, properties);
  });

  return [schemas, types, typeNodes] as const;
};

const censorProperty = (
  type: ParsedType,
  value: any,
  classification: Classication,

  structure?: SchemaPropertyStructure
) => {
  if (value == null) return undefined;

  if (structure?.map) {
    if (!isObject(structure)) return undefined;

    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => [
        key,
        censorProperty(type, value, classification, {
          array: structure!.array,
        }),
      ])
    );
  }
  if (structure?.array) {
    if (!isArray(value)) return undefined;
    structure = isObject(structure.array) ? structure.array : undefined;
    return value
      .map((item) => censorProperty(type, item, classification))
      .filter((item) => item);
  }

  return censor(type, value, classification);
};

const censor = (type: ParsedType, value: any, classification: Classication) => {
  if (!isObject(value)) return value;

  if (!validateConsent(type as Required<Classication>, classification))
    return undefined;

  let any = false;
  const censored: any = {};

  for (const key in value) {
    const property = type.properties.get(key);
    if (!property || !validateConsent(property, classification)) {
      continue;
    }

    const propertyValue = property.objectType
      ? censorProperty(
          property.objectType,
          value[key],
          classification,
          property.structure
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

const contextError = (context: TraverseContext, error: string) => () =>
  `${context.path.join("/")}: ${error}`;
