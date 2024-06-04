import {
  ParsableConsent,
  TrackedEvent,
  VariableScope,
  variableScope,
} from "@tailjs/types";

import {
  IDENTITY,
  JsonObject,
  MaybeArray,
  MaybeUndefined,
  RecordType,
  array,
  assignIfUndefined,
  clone,
  first,
  forEach,
  get,
  ifDefined,
  invariant,
  isNumber,
  obj,
  required,
  throwError,
  unlock,
  validate,
} from "@tailjs/util";
import addFormats from "ajv-formats";
import Ajv from "ajv/dist/2020";

import { PATCH_EVENT_POSTFIX } from "@constants";

import {
  Schema,
  SchemaAnnotations,
  SchemaEntity,
  SchemaObjectType,
  SchemaProperty,
  SchemaSystemTypes,
  SchemaType,
  SchemaVariable,
  SchemaVariableSet,
  isObjectType,
} from ".";
import {
  ParsedComposition,
  ParsedType,
  patchValue,
  parseError,
  parseSchema,
  validationError,
} from "./parse";

const extractDescription = (
  entity: Partial<Pick<SchemaEntity, "title" | "description" | "tags">>
) => ({
  title: entity.title,
  description: entity.description,
  tags: entity.tags,
});

/** The name of the {@link TrackedEvent.patchTargetId} property. */
const PATCH_TARGET_ID = "patchTargetId";

const parsedSource = Symbol();
export class SchemaManager {
  public readonly schema: Schema;
  public readonly subSchemas: ReadonlyMap<string, Schema> = new Map();
  public readonly types: ReadonlyMap<string, SchemaObjectType> = new Map();

  /**
   * A manager that contains all the same types as this one, but without required properties.
   * These types are used for validating event patches.
   */
  private readonly _patchSchema: SchemaManager;

  /**
   *
   * Creates a {@link SchemaManager} for validating, parsing and censoring event and variable types.
   *
   * @param schemas The individual source JSON Schemas that composes the runtime schema.
   */
  public static create(schemas: MaybeArray<JsonObject>): SchemaManager {
    return new SchemaManager(schemas, false);
  }

  /**
   *
   * @param schemas The individual source JSON Schemas that composes the runtime schema.
   * @param patches Flag that indicates whether the schema is for patch events.
   * @param reparse This is the second parse for the patch schema.
   *
   * Per convention, patch events type names are postfixed with `_patch` and only the {@link TrackedEvent.type} and
   *  {@link TrackedEvent.patchTargetId} properties are required.
   */
  private constructor(
    schemas: MaybeArray<JsonObject>,
    patches = false,
    reparse = false
  ) {
    schemas = array(schemas);

    let combinedSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "urn:tailjs:runtime",
      description:
        "The effective schema for this particular configuration of tail.js that bundles all included schemas." +
        "\n" +
        "Please note that the shadow types for patching events are not represented in this schema. Per convention any event type " +
        "postfixed with `_patch` will be validated against its source event, but without required properties apart from " +
        "`" +
        PATCH_TARGET_ID +
        "` and `type`.",
      $defs: obj(schemas, (schema: RecordType) => [
        validate(
          schema.$id,
          schema.$id && schema.$schema,
          "A schema must have an $id and $schema property."
        ),
        clone(schema),
      ]),
    };

    const reset = () => {
      const ajv = new Ajv().addKeyword("$anchor");

      forEach(SchemaAnnotations, ([, keyword]) => ajv.addKeyword(keyword));

      addFormats(ajv);
      return ajv;
    };
    let ajv = reset();

    ajv.addSchema(combinedSchema);
    let [parsedSchemas, parsedTypes] = parseSchema(combinedSchema, ajv);

    // A brand new instance is required since we have tampered with the schema while parsing (e.g. setting unevaluatedProperties true/false and added anchors).
    (ajv = reset()).compile(combinedSchema);
    parsedSchemas.forEach((parsed) => {
      const schema: Schema = {
        id: parsed.id,
        ...extractDescription(parsed),

        classification: parsed.classification!,
        purposes: parsed.purposes!,
        types: new Map(),
        subSchemas: new Map(),
        definition: parsed.definition,
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

    parsedTypes.forEach((parsedType) => {
      const validate = required(
        ajv.getSchema(parsedType.context.$ref!),
        () =>
          `INV <> The ref '${parsedType.context.$ref}' does not address the type '${parsedType.id}' in the schema.`
      );

      const type: SchemaObjectType = {
        id: parsedType.id,
        name: parsedType.name,
        ...extractDescription(parsedType),

        classification: parsedType.classification!,
        purposes: parsedType.purposes!,
        primitive: false,
        abstract: !!parsedType.abstract,
        schema: invariant(
          this.subSchemas.get(parsedType.context.schema!.id),
          "Schemas are mapped."
        ),

        definition: parsedType.composition.node,

        patch: (value, classification, write, addMetadata) =>
          patchValue(
            parsedType,
            value,
            classification,
            undefined,
            write,
            // Using a number is not supported through the public API.
            // This is to support property validation in a more or less hacky way.
            isNumber(addMetadata) ? addMetadata : addMetadata ? 0 : 1
          ),

        tryValidate: (value) => (validate(value) ? value : undefined),

        validate: (value) =>
          validate(value)
            ? value
            : throwError(validationError(type.id, validate.errors, value)),
      };
      (type as any)[parsedSource] = parsedType;
      unlock(type.schema.types).set(type.id, type);
      (this.types as Map<any, any>).set(type.id, type);
    });

    var trackedEvent = first(
      parsedTypes,
      ([, type]) => type.schemaId === SchemaSystemTypes.Event
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
        const propertyType = required(
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
        );

        const property: SchemaProperty = {
          id: parsedProperty.id,
          name: parsedProperty.name,
          ...extractDescription(parsed),

          classification: parsedProperty.classification,
          purposes: parsedProperty.purposes,
          declaringType: type,
          structure: parsedProperty.structure,
          required: parsedProperty.required,

          definition: parsedProperty.typeContext?.node,

          polymorphic: !!parsedProperty.polymorphic,
          type: propertyType,
          validate: (value) =>
            type.validate({ [property.name]: value })?.[property.name],
          tryValidate: (value) =>
            type.tryValidate({ [property.name]: value })?.[property.name],
          patch: (value, consent, write, addMetadata) =>
            type.patch(
              { [property.name]: value },
              consent,
              write,
              addMetadata ? (-1 as any) : false
            )?.[property.name],
        };
        (property as any)["parsed"] = parsedProperty;
        unlock((type.properties ??= new Map())).set(property.name, property);

        if (
          trackedEvent &&
          key === "type" &&
          parsed.extendsAll?.has(trackedEvent)
        ) {
          array(
            parsedProperty.typeContext?.node.const ??
              parsedProperty.typeContext?.node.enum
          )?.forEach((alias: any, i: number) => {
            i === 0 && (type.eventTypeName = alias);
            assignIfUndefined(
              unlock((type.schema!.events ??= new Map())),
              alias,
              type,
              (key, current) =>
                `The event '${type.id}' cannot be defined for the type '${key}' since '${current.id}' is already registered.`
            );
          });
        }

        // If $defs defines object types named of a variable scope + "Variables" ("GlobalVariables", "SessionVariables", "DeviceVariables",  "UserVariables" or"EntityVariables"),
        // their properties will be added as variable definitions to the respective scopes.
        let variableScopeTarget: VariableScope | undefined;
        if (
          type.name.endsWith("Variables") &&
          (variableScopeTarget = variableScope.tryParse(
            type.name.replace(/Variables$/, "")
          )) != null
        ) {
          forEach(type.properties, ([, property]: [any, SchemaVariable]) => {
            if (property.required) {
              throw new Error(
                `The type '${type.id}' cannot have required properties since it defines scope variables.`
              );
            }

            property.scope = variableScopeTarget!;

            get(
              (type.schema!.variables ??= new Map()),
              variableScopeTarget,
              () => new Map()
            ).set(property.name, property);
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

    if (patches) {
      if (reparse) {
        this._patchSchema = this;
      } else {
        // Postfix "_patch" to all event types, and make all properties optional except events' `type` and `patchTargetId`.
        this.subSchemas.forEach((schema) => {
          schema.types.forEach((type) => {
            if (type.schema !== schema) return;
            const parsed = type[parsedSource] as ParsedType;

            if (isObjectType(type) && parsed) {
              const removeRequired = (cmp: ParsedComposition) => {
                if (type.eventTypeName && cmp.node.required?.includes("type")) {
                  cmp.node.required = ["type", PATCH_TARGET_ID];
                } else {
                  delete cmp.node.required;
                }
                cmp.compositions?.forEach(removeRequired);
              };
              removeRequired(parsed.composition);

              if (type.eventTypeName) {
                type.eventTypeName += PATCH_EVENT_POSTFIX;
                const context = parsed.properties.get("type")?.typeContext;
                if (context) {
                  context.node.const &&
                    (context.node.const =
                      context.node.const + PATCH_EVENT_POSTFIX);
                  context.node.enum &&
                    (context.node.enum = context.node.enum.map(
                      (name: string) => name + PATCH_EVENT_POSTFIX
                    ));
                }
              }
            }
          });
        });

        // Re-parse modified patch schema.
        this._patchSchema = new SchemaManager(
          Object.values(combinedSchema.$defs)!,
          true,
          true
        );
      }
    } else {
      this._patchSchema = new SchemaManager(schemas, true)._patchSchema;
    }
  }

  public getSchema<Required = true>(
    schemaId: string | undefined,
    require?: Required & boolean
  ): MaybeUndefined<Required, Schema> {
    return require
      ? required(
          this.getSchema(schemaId, false as any) as any,
          () => `The schema '${schemaId}' has not been registered.`
        )
      : schemaId && this.subSchemas.get(schemaId);
  }

  public isPatchType(eventTypeOrTypeId: string | undefined): boolean {
    return eventTypeOrTypeId?.endsWith(PATCH_EVENT_POSTFIX) === true;
  }

  public getType<Required = true>(
    eventTypeOrTypeId: string | undefined,
    require?: Required & boolean,
    concreteOnly = true
  ): MaybeUndefined<Required, SchemaObjectType<any>> {
    return this.isPatchType(eventTypeOrTypeId) && this._patchSchema !== this
      ? this._patchSchema.getType(eventTypeOrTypeId, require, concreteOnly)
      : require
      ? required(
          this.getType(eventTypeOrTypeId, false, concreteOnly),
          () => `The type or event type '${eventTypeOrTypeId}' is not defined.`
        )
      : ifDefined(eventTypeOrTypeId, () =>
          validate(
            this.schema.events?.get(eventTypeOrTypeId!) ??
              this.types.get(eventTypeOrTypeId!),
            (type) => !type || !concreteOnly || (type && !type.abstract),
            () =>
              `The type '${eventTypeOrTypeId}' is abstract and cannot be used directly.`
          )
        )!;
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
    return id && this.getType(id, false)?.tryValidate(value);
  }

  public validate<T>(typeId: string, value: T): T;
  public validate<T>(eventType: string, event: T): T;
  public validate(id: string, value: any) {
    return this.getType(id, true).validate(value);
  }

  public patch<T>(
    typeId: string,
    value: T,
    consent: ParsableConsent,
    validate?: boolean,
    addMetadata?: boolean
  ): T | undefined;
  public patch<T>(
    eventType: string,
    event: T,
    consent: ParsableConsent,
    validate?: boolean,
    addMetadata?: boolean
  ): T | undefined;
  public patch(
    id: string,
    value: any,
    consent: ParsableConsent,
    validate = true,
    write = false,
    addMetadata = true
  ) {
    return ifDefined(
      this.getType(id, true),
      (target) => (
        validate && target.validate(value),
        target.patch(value, consent, write, addMetadata)
      )
    );
  }

  public compileVariableSet(schemas?: MaybeArray<string | Schema | undefined>) {
    schemas = array(schemas);
    return new SchemaVariableSet(
      this,
      schemas == null || schemas.includes("*")
        ? this.subSchemas.values()
        : schemas
    );
  }
}
