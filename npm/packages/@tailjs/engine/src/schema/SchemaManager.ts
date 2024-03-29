import {
  UserConsent,
  VariableKey,
  VariableScope,
  variableScope,
} from "@tailjs/types";
import {
  MaybeRequired,
  PartialRecord,
  assignIfUndefined,
  forEach,
  get,
  invariant,
  isString,
  obj,
  required,
  throwError,
  toArray,
  unlock,
  validate,
} from "@tailjs/util";
import addFormats from "ajv-formats";
import Ajv from "ajv/dist/2020";
import {
  Schema,
  SchemaClassification,
  SchemaProperty,
  SchemaType,
  SchemaVariable,
  tryParsePrimitiveType,
} from "..";
import {
  censor,
  parseError,
  parseSchema,
  validationError,
} from "./parseSchema";

const ids = {
  TrackedEvent: "urn:tailjs:core#TrackedEvent",
};

export class SchemaManager {
  public readonly schema: Schema;
  public readonly subSchemas: ReadonlyMap<string, Schema> = new Map();
  public readonly types: ReadonlyMap<string, SchemaType> = new Map();

  private readonly _variables: Record<
    VariableScope,
    Map<string, Map<Schema, SchemaVariable>>
  > = [] as any;

  constructor(schemas: any[]) {
    const combinedSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "urn:tailjs:runtime",
      description:
        "The effective schema for this particular configuration of tail.js that bundles all included schemas.",
      $defs: obj(schemas, (schema) => [
        validate(
          schema.$id,
          schema.$id && schema.$schema,
          "A schema must have an $id and $schema property."
        ),
        schema,
      ]),
    };

    const reset = () => {
      const ajv = new Ajv()
        .addKeyword("x-privacy-class")
        .addKeyword("x-privacy-purpose")
        .addKeyword("x-privacy-purposes")
        .addKeyword("x-tags")
        .addKeyword("$anchor")
        .addKeyword("x-privacy-ignore");

      addFormats(ajv);
      return ajv;
    };
    let ajv = reset();

    ajv.addSchema(combinedSchema);
    const [parsedSchemas, parsedTypes] = parseSchema(combinedSchema, ajv);

    // A brand new instance is required since we have tampered with the schema while parsing (e.g. setting unevaluatedProperties true/false and added anchors).
    (ajv = reset()).compile(combinedSchema);
    parsedSchemas.forEach((parsed) => {
      const schema: Schema = {
        id: parsed.id,
        classification: parsed.classification!,
        purposes: parsed.purposes!,
        types: new Map(),
        subSchemas: new Map(),
      };

      (this.subSchemas as Map<any, any>).set(schema.id, schema);
    });

    parsedSchemas.forEach((parsed) => {
      const schema = this.subSchemas.get(parsed.id)!;
      forEach(parsed.subSchemas, ([, parsedSubSchema]) => {
        const subSchema = required(this.subSchemas.get(parsedSubSchema.id));
        subSchema.parent = schema;
        ((schema.subSchemas ??= new Map()) as Map<string, Schema>).set(
          subSchema.id,
          subSchema
        );
      });
    });

    parsedTypes.forEach((parsed) => {
      const validate = required(
        ajv.getSchema(parsed.context.$ref!),
        () =>
          `INV <> The ref '${parsed.context.$ref}' does not address the type '${type.id}' in the schema.`
      );

      const type: SchemaType = {
        id: parsed.id,
        name: parsed.name,
        description: parsed.description,
        classification: parsed.classification!,
        purposes: parsed.purposes!,
        primitive: false,
        abstract: parsed.abstract,
        schema: invariant(
          this.subSchemas.get(parsed.context.schema!.id),
          "Schemas are mapped."
        ),

        censor: (value, classification) =>
          censor(parsed, value, classification),

        tryValidate: (value) => (validate(value) ? value : undefined),

        validate: (value) =>
          validate(value)
            ? value
            : throwError(validationError(type.id, validate.errors, value)),
      };
      (this.types as Map<any, any>).set(type.id, type);
    });

    parsedTypes.forEach((parsed) => {
      const type = this.types.get(parsed.id)!;

      const set = <T extends { id: string }>(
        target: ReadonlyMap<string, T>,
        item: T
      ) => (target as Map<string, T>).set(item.id, item);

      forEach(parsed.extends, (parsedBaseType) =>
        set(
          (type.extends ??= new Map()),
          invariant(
            this.types.get(parsedBaseType.id),
            `Extended type is mapped.`
          )
        )
      );
      forEach(parsed.extenders, (parsedBaseType) =>
        set(
          (type.extenders ??= new Map()),
          invariant(
            this.types.get(parsedBaseType.id),
            "Extending type is mapped."
          )
        )
      );

      forEach(parsed.properties, ([key, parsedProperty]) => {
        const property: SchemaProperty = {
          id: type + "#" + key,
          name: parsedProperty.name,
          description: parsedProperty.description,
          classification: parsedProperty.classification,
          purposes: parsedProperty.purposes,
          declaringType: type,
          structure: parsedProperty.structure,
          required: parsedProperty.required,
          type: required(
            parsedProperty.objectType
              ? this.types.get(parsedProperty.objectType.id)
              : tryParsePrimitiveType(parsedProperty.typeContext?.node),
            () =>
              parseError(
                parsed.context,
                `Unknown property type. (${JSON.stringify(
                  parsedProperty.typeContext!.node
                )})`
              )
          ),
        };
        unlock((type.properties ??= new Map())).set(property.name, property);

        if (key === "type" && type.extends?.has(ids.TrackedEvent)) {
          toArray(
            parsedProperty.typeContext?.node.const ??
              parsedProperty.typeContext?.node.enum
          )?.forEach((alias) =>
            assignIfUndefined(
              unlock((type.schema!.events ??= new Map())),
              alias,
              type,
              (key, current) =>
                `The event '${type.id}' cannot be defined for the type '${key}' since '${current.id}' is already registered.`
            )
          );
        }

        if (variableScope.tryParse(type.name)) {
          const scopeId = variableScope.parse(type.name);
          forEach(type.properties, ([, property]: [any, SchemaVariable]) => {
            if (property.required) {
              throw new Error(
                `The type '${type.id}' cannot have required properties since it defines scope variables.`
              );
            }

            property.censor = (value, consent) =>
              property.type.censor({ [property.name]: value }, consent)?.[
                property.name
              ];

            property.validate = (value) =>
              type.validate({ [property.name]: value })[property.name];

            property.tryValidate = (value) =>
              type.tryValidate({ [property.name]: value })?.[property.name];

            property.scope = scopeId;

            unlock(
              ((type.schema!.variables ??= [] as any)[scopeId] ??= new Map())
            ).set(property.name, property);

            get(
              (this._variables[scopeId] ??= new Map()),
              key,
              () => new Map()
            ).set(type.schema, property);
          });
        }
      });
    });

    // Push nested schema types and events to parent schema. At the same time validate that event type IDs are unique.
    //
    // Also, don't push variables since those are scoped to their schema IDs. It is not sensible to detect variable name clashes
    // at the global level since prefixed variable storages may only use a subset of the schema.
    // Hence, it is their responsibility to merge their respective schemas and check for name clashes.
    this.subSchemas.forEach((schema) => {
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
          unlock((parent!.events ??= new Map())).set(key, event);
        });
        schema.types.forEach((type) => {
          (parent!.types as Map<string, SchemaType>).set(type.id, type);
        });
        parent = parent.parent;
      }
    });

    parsedTypes.forEach((parsed) => {
      const type = this.types.get(parsed.id);
      forEach(type?.referencedBy, (parsedProperty) =>
        ((type!.referencedBy ??= new Set()) as Set<SchemaProperty>).add(
          invariant(
            this.types
              .get(parsedProperty.declaringType.id)
              ?.properties?.get(parsedProperty.name),
            "Referencing property is mapped."
          )
        )
      );
    });

    this.schema = invariant(
      this.subSchemas.get("urn:tailjs:runtime"),
      "Runtime schema is registered."
    );
  }

  public getSchema<Required = true>(
    schemaId: MaybeRequired<string, Required>,
    require?: Required & boolean
  ): MaybeRequired<Schema, Required> {
    return require
      ? required(
          this.getSchema(schemaId, false as any) as any,
          () => `The schema '${schemaId}' has not been registered.`
        )
      : schemaId && this.subSchemas.get(schemaId);
  }

  public getType<Required = true>(
    typeId: MaybeRequired<string, Required>,
    require?: Required & boolean,
    concreteOnly = true
  ): Required extends true ? SchemaType : undefined | SchemaType {
    return require
      ? required(
          this.getType(typeId, false as any, concreteOnly),
          () => `The type '${typeId}' is not defined.`
        )
      : typeId &&
          validate(
            this.types.get(typeId!),
            (type) => !concreteOnly || (type && !type.abstract),
            () =>
              `The type '${typeId}' is abstract and cannot be used directly.`
          );
  }

  public getVariable<Required = true>(
    key: MaybeRequired<Pick<VariableKey, "scope" | "key">, Required>,
    require?: Required & boolean,
    schemas?: Iterable<Schema>
  ): MaybeRequired<SchemaVariable, Required> {
    if (require) {
      return required(
        this.getVariable(key, false as any, schemas),
        () =>
          `The variable '${
            key!.key
          }' is not defined in the ${variableScope.lookup(key!.scope)} scope.`
      );
    }

    if (key) {
      const candidates = this._variables[variableScope.parse(key.scope)]?.get(
        key.key
      );
      if (candidates) {
        for (const schema of schemas ?? this.subSchemas.values()) {
          const match = candidates.get(schema);
          if (match) {
            return match as any;
          }
        }
      }
    }
    return undefined as any;
  }

  public tryValidate<T>(
    typeId: string | null | undefined,
    value: T
  ): T | undefined;
  public tryValidate<T>(
    eventType: string | null | undefined,
    event: T
  ): T | undefined;
  public tryValidate<T>(
    variable: Pick<VariableKey, "scope" | "key"> | null | undefined,
    value: T,
    schemas?: Iterable<Schema>
  ): T | undefined;
  public tryValidate(
    id: string | VariableKey | null | undefined,
    value: any,
    schemas?: Iterable<Schema>
  ) {
    return (
      id &&
      (isString(id)
        ? this.schema.events?.get(id) ?? this.getType(id, false)
        : this.getVariable(id, false, schemas)
      )?.tryValidate(value)
    );
  }

  public validate<T>(typeId: string, value: T): T;
  public validate<T>(eventType: string, event: T): T;
  public validate<T>(
    variable: Pick<VariableKey, "scope" | "key">,
    value: T,
    schemas?: Iterable<Schema>
  ): T;
  public validate(
    id: string | VariableKey,
    value: any,
    schemas?: Iterable<Schema>
  ) {
    return (
      isString(id)
        ? this.schema.events?.get(id) ?? this.getType(id, true)
        : this.getVariable(id, true, schemas)
    ).validate(value);
  }

  public censor<T>(
    typeId: string,
    value: T,
    consent: SchemaClassification | UserConsent
  ): T;
  public censor<T>(
    eventType: string,
    event: T,
    consent: SchemaClassification | UserConsent
  ): T;
  public censor<T>(
    variable: Pick<VariableKey, "scope" | "key">,
    value: T,
    consent: SchemaClassification | UserConsent,
    schemas?: Iterable<Schema>
  ): T;
  public censor(
    id: string | VariableKey,
    value: any,
    classification: SchemaClassification,
    schemas?: Iterable<Schema>
  ) {
    return (
      isString(id)
        ? this.schema.events?.get(id) ?? this.getType(id, true)
        : this.getVariable(id, true, schemas)
    ).censor(value, classification);
  }

  public validateVariableUniqueness(schemas?: Iterable<Schema>) {
    const seen: PartialRecord<
      VariableScope,
      Map<string, SchemaVariable[]>
    > = [] as any;

    const conflicts: SchemaVariable[] = [];

    for (const schema of schemas ?? this.subSchemas.values()) {
      forEach(schema.variables, ([, variables]) =>
        variables?.forEach((variable) => {
          const current = get(
            (seen[variable.scope] ??= new Map()) as Map<
              string,
              SchemaVariable[]
            >,
            variable.name,
            () => []
          );
          if (current.length) {
            conflicts.push(variable);
          }

          current.push(variable);
        })
      );
    }

    return conflicts;
  }
}
