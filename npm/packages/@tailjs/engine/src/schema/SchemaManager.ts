import { UserConsent, variableScope } from "@tailjs/types";
import {
  IfNot,
  MaybeRequired,
  assignIfUndefined,
  first,
  forEach,
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
  SchemaObjectType,
  SchemaProperty,
  SchemaType,
  SchemaVariable,
  SchemaVariableSet,
  VariableMap,
  systemTypes,
} from "..";
import { censor, parseError, parseSchema, validationError } from "./parse";

export class SchemaManager {
  public readonly schema: Schema;
  public readonly subSchemas: ReadonlyMap<string, Schema> = new Map();
  public readonly types: ReadonlyMap<string, SchemaObjectType> = new Map();

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
        .addKeyword("x-privacy-censor");

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
          `INV <> The ref '${parsed.context.$ref}' does not address the type '${parsed.id}' in the schema.`
      );

      const type: SchemaObjectType = {
        id: parsed.id,
        name: parsed.name,
        description: parsed.description,
        classification: parsed.classification!,
        purposes: parsed.purposes!,
        primitive: false,
        abstract: !!parsed.abstract,
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
      unlock(type.schema.types).set(type.id, type);
      (this.types as Map<any, any>).set(type.id, type);
    });

    var trackedEvent = first(
      parsedTypes,
      ([, type]) => type.schemaId === systemTypes.event
    )?.[1];
    parsedTypes.forEach((parsed) => {
      const type = this.types.get(parsed.id)!;

      const set = <T extends { id: string }>(
        target: ReadonlyMap<string, T>,
        item: T
      ) => (target as Map<string, T>).set(item.id, item);

      forEach(parsed.extends, (parsedBaseType) =>
        set(
          (type.subtypes ??= new Map()),
          invariant(
            this.types.get(parsedBaseType.id),
            `Extended type is mapped.`
          )
        )
      );
      forEach(parsed.subtypes, (parsedBaseType) =>
        set(
          (type.subtypes ??= new Map()),
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
              : parsedProperty.primitiveType ?? ({} as any),
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

        if (
          trackedEvent &&
          key === "type" &&
          parsed.extends?.has(trackedEvent)
        ) {
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

        // If $defs defines object types named of a variable scope ("Global", "Session", "Device",  "User" or"Entity"),
        // their properties will be added as variable definitions to the respective scopes.
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

            (type.schema!.variables ??= new VariableMap()).set(
              scopeId,
              property.name,
              property
            );
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
  ): SchemaType | IfNot<Required> {
    return require
      ? required(
          this.getType<false>(typeId, false, concreteOnly),
          () => `The type '${typeId}' is not defined.`
        )
      : typeId &&
          validate(
            this.schema.events?.get(typeId!) ?? this.types.get(typeId!),
            (type) => !type || !concreteOnly || (type && !type.abstract),
            () =>
              `The type '${typeId}' is abstract and cannot be used directly.`
          );
  }

  public tryValidate<T>(
    typeId: string | null | undefined,
    value: T
  ): T | undefined;
  public tryValidate<T>(
    eventType: string | null | undefined,
    event: T
  ): T | undefined;
  public tryValidate(id: string | null | undefined, value: any) {
    return (
      id &&
      (this.schema.events?.get(id) ?? this.getType(id, false))?.tryValidate(
        value
      )
    );
  }

  public validate<T>(typeId: string, value: T): T;
  public validate<T>(eventType: string, event: T): T;
  public validate(id: string, value: any) {
    return (this.schema.events?.get(id) ?? this.getType(id, true)).validate(
      value
    );
  }

  public censor<T>(
    typeId: string,
    value: T,
    consent: SchemaClassification | UserConsent
  ): T | undefined;
  public censor<T>(
    eventType: string,
    event: T,
    consent: SchemaClassification | UserConsent
  ): T | undefined;
  public censor(
    id: string,
    value: any,
    consent: SchemaClassification | UserConsent
  ) {
    return (this.schema.events?.get(id) ?? this.getType(id, true)).censor(
      value,
      consent
    );
  }

  public createVariableSet(
    schemas?: string | Iterable<string | Schema | undefined>
  ) {
    return new SchemaVariableSet(
      this,
      isString(schemas) ? [schemas] : schemas ?? this.subSchemas.values()
    );
  }
}
