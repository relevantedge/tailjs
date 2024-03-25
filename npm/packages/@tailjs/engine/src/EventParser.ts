import { TrackedEvent } from "@tailjs/types";
import { Schema, Validator } from "jsonschema";
import { ReadOnlyRecord } from "./lib";
import { JsonString } from "./shared";

export function getErrorMessage(validationResult: any) {
  return !validationResult["type"] ? validationResult["error"] : null;
}

export type ValidationError = { error: string; source: any };
export const isValidationError = (item: any): item is ValidationError =>
  item && item["type"] == null && item["error"] != null;

export type ParseResult = TrackedEvent | ValidationError;

export type SchemaDefinition = { name: string; json: string | Schema };

function tryGetEventTypeIds(typeDefinition: Schema) {
  let typeIds: string[] = [];
  if (typeDefinition.type === "object") {
    const typeProp = typeDefinition.properties?.type;
    if (typeof typeProp?.const === "string") {
      typeIds.push(typeProp.const);
    }
    typeProp?.enum?.forEach((value) => {
      if (typeof value === "string" && value !== typeIds[0]) {
        typeIds.push(value);
      }
    });
  }
  typeDefinition.allOf?.forEach((definition) =>
    typeIds.push(...tryGetEventTypeIds(definition))
  );
  return typeIds;
}

export interface SchemaWithBaseTypes extends Schema {
  /**
   * The base an object type implements.
   */
  implements?: string[];
}

export interface ModelMetadata {
  hasProperty(
    event: TrackedEvent | null | undefined,
    property: string
  ): boolean;

  is<T = TrackedEvent>(
    event: TrackedEvent | T | null | undefined,
    typeName: string | null | undefined,
    includeSelf?: boolean
  ): event is T;
}

const getSchemaReference = (typeName: string) => `#/definitions/${typeName}`;
const getSchemaTypeName = (ref: string) => ref.replace("#/definitions/", "");

const isValidated = Symbol("validated");

export class EventParser implements ModelMetadata {
  private readonly _types: {
    [key: string]: {
      name: string;
      schemaId?: string;
      schema: Schema;
    };
  } = {};
  private readonly _validator: Validator = new Validator();

  public readonly events: ReadOnlyRecord<string, SchemaWithBaseTypes>;

  constructor(schema: Record<string, JsonString<Schema> | Schema>) {
    const events = {};

    const mergeAllOf = (
      schema: SchemaWithBaseTypes,
      type = schema,
      typeName?: string
    ): SchemaWithBaseTypes => {
      if (type.allOf || type.type === "object") {
        if (
          type.additionalProperties == null ||
          type.additionalProperties === true
        ) {
          type.additionalProperties = false;
        }
      }
      if (type.definitions) {
        type = {
          ...type,
          definitions: Object.fromEntries(
            Object.entries(type.definitions).map(([key, value]) => [
              key,
              mergeAllOf(schema, value, key),
            ])
          ),
        };
      }
      if (!typeName) {
        return type;
      }

      if (type.allOf) {
        let merged = { type: "object", ...type };
        merged.implements = [];
        delete merged["allOf"];
        for (const part of type.allOf) {
          let properties = part.properties;
          let required = part.required;

          if (!properties && part.$ref) {
            merged.implements!.push(part.$ref);

            const refTypeName = getSchemaTypeName(part.$ref);
            const reffed = schema.definitions?.[refTypeName];
            if (!reffed) {
              throw new Error(
                `Invalid type definition. The referenced type ${part.$ref} could not be resolved.`
              );
            }
            const mergedRef = mergeAllOf(schema, reffed, refTypeName);
            properties = mergedRef?.properties;
            required = mergedRef?.required;
            properties &&
              (properties = Object.fromEntries(
                Object.entries(properties).map(([key, value]) => [
                  key,
                  { $baseType: part.$ref, ...value } as any,
                ])
              ));

            mergedRef.implements?.forEach((value) =>
              merged.implements!.push(value)
            );
          }

          if (properties) {
            merged = {
              ...merged,
              properties: part.$ref
                ? { ...properties, ...merged.properties } // Don't overwrite from base type.
                : { ...merged.properties, ...properties },
            };
            if (Array.isArray(required)) {
              (merged.required = Array.isArray(merged.required)
                ? merged.required
                : []).push(...required);
            }
          }
        }

        if (Array.isArray(merged.required)) {
          // One include required properties once.
          merged.required = [...new Set(merged.required)];
        }
        merged.implements &&
          (merged.implements = [...new Set<string>(merged.implements)]);
        return merged;
      }

      return type;
    };

    const appendSubtypes = (
      schema: SchemaWithBaseTypes,
      type = schema,
      typeName?: string
    ): SchemaWithBaseTypes => {
      if (type.definitions) {
        Object.entries(type.definitions).forEach(([key, value]) =>
          appendSubtypes(schema, value, key)
        );
      }

      typeName &&
        type.properties &&
        type.implements?.forEach((baseTypeName) => {
          const baseType =
            schema.definitions?.[getSchemaTypeName(baseTypeName)];
          if (!baseType || baseType.type !== "object" || !baseType.properties) {
            return;
          }
          Object.entries(type.properties!).forEach(
            ([key, value]) =>
              (baseType!.properties![key] ??= {
                ...value,
                const: undefined,
                $subtype: getSchemaReference(typeName),
              } as any)
          );
        });

      return type;
    };

    const registerEvent = (
      eventSchema: Schema,
      schemaId: string | undefined,
      ids: string[]
    ) => {
      if (!ids.length) {
        throw new Error(
          `An event cannot be registered without a constant value for its type name ({"type": "string", "const": "[Type name]' or "enum":["[Type name]",...]}).`
        );
      }
      const reg = {
        name: ids[0],
        schema: eventSchema,
        schemaId,
      };

      const add = (alias: string, registration: typeof reg) => {
        const current = this._types[alias];
        if (current && current !== registration) {
          throw new Error(
            `Cannot add the type '${registration.name}' with the alias '${alias}' since that is already in use by '${current.name}'.`
          );
        }
        this._types[alias] = registration;
      };

      for (const alias of ids) {
        add(alias, reg);
      }

      events[reg.name] = reg.schema;

      return reg;
    };

    const rewriteRefs = (parent: any, rewrite: (current: string) => string) => {
      if (typeof parent !== "object") return;
      if (Array.isArray(parent)) {
        parent.forEach((item) => rewriteRefs(item, rewrite));
      } else {
        for (const prop in parent) {
          const value = parent[prop];
          if (prop === "$ref" && value.startsWith("#")) {
            parent[prop] = rewrite(value as string);
          } else {
            rewriteRefs(value, rewrite);
          }
        }
      }
    };

    for (const [_, source] of Object.entries(schema)) {
      const schema: Schema = appendSubtypes(
        mergeAllOf(typeof source === "string" ? JSON.parse(source) : source)
      );

      const schemaDefs: Record<string, Schema> = {};
      const schemaEvents: Schema[] = [];

      if (schema.type) {
        const ids = tryGetEventTypeIds(schema);

        if (!ids.length) {
          throw new Error("A schema with a root type must be an event.");
        }

        registerEvent(schema, schema.$id, ids);
        continue;
      } else if (!schema.definitions) {
        // Empty schema.
        continue;
      }

      for (const [name, def] of Object.entries(schema.definitions)) {
        const ids = tryGetEventTypeIds(def);

        if (!ids.length) {
          schemaDefs[name] = def;
          continue;
        }

        schemaEvents.push(registerEvent(def, schema.$id, ids).schema);
      }

      for (const event of schemaEvents) {
        function patch(schema: Schema) {
          rewriteRefs(schema, (current) => {
            event.definitions ??= {};
            const name = current.replace(/^.*?([^\/]+)$/, "$1");
            if (!event.definitions[name]) {
              const def = schemaDefs[name];
              if (!def) {
                throw new Error(
                  `The reference ${name} could not be resolved. Mind that an event cannot reference other events.`
                );
              }
              event.definitions[name] = def;
              patch(def);
            }
            return current;
          });
        }
        patch(event);

        this._validator.addSchema(event);
      }
    }

    this.events = events;
  }

  hasProperty(
    event: TrackedEvent | null | undefined,
    property: string
  ): boolean {
    return (
      event != null && this.events[event.type]?.properties?.[property] != null
    );
  }

  is<T = TrackedEvent>(
    event: T | TrackedEvent | null | undefined,
    baseType: string | null | undefined,
    includeSelf = true
  ): event is T {
    const type = (event as any)?.type;
    if (!type) return false;
    return (
      type != null &&
      baseType != null &&
      ((includeSelf && type === baseType) ||
        this.events[(event as any).type]?.implements?.includes(
          getSchemaReference(baseType)
        ) === true)
    );
  }

  public parseAndValidate(data: string | {}, knownOnly = false): ParseResult[] {
    const parsed = this.parse(data);
    return this.validate(parsed, knownOnly);
  }

  public parse(data: string | {}): ParseResult[] {
    let events = typeof data === "string" ? JSON.parse(data) : data;
    if (!Array.isArray(events)) {
      events = [events];
    }
    const results: ParseResult[] = [];

    for (const instance of events) {
      if (typeof instance !== "object" || Array.isArray(instance)) {
        results.push({ error: "Object expected", source: instance });
        continue;
      }

      if (!instance.type) {
        results.push({
          error: "A type property was expected.",
          source: instance,
        });
      }

      const reg = this._types[instance.type];
      if (reg) {
        instance.type = reg.name;
        instance.schema = reg.schemaId;
      }
      results.push(instance);
    }
    return results;
  }

  public validate(events: ParseResult[], knownOnly = false): ParseResult[] {
    const validated: ParseResult[] = [];
    for (const instance of events) {
      if (isValidationError(instance) || instance[isValidated]) {
        validated.push(instance);
        continue;
      }
      const reg = this._types[instance.type];
      if (!reg) {
        if (!knownOnly) {
          validated.push(instance);
          continue;
        }
        validated.push({
          error: `No such type: '${instance.type}'.`,
          source: instance,
        });
        continue;
      }

      if (!instance.type) {
        validated.push({
          error: "A type property was expected.",
          source: instance,
        });
        continue;
      }

      const result = this._validator.validate(instance, reg.schema, {
        nestedErrors: true,
        throwError: false,
      });
      if (!result.valid) {
        validated.push({
          error: result.errors
            .map(
              (error) =>
                `${error.path.length ? error.path.join(".") : "instance"} ${
                  error.message
                }`
            )
            .join("\n"),
          source: instance,
        });
        continue;
      }
      instance.type = reg.name;
      instance[isValidated] = true;
      validated.push(instance);
    }

    return validated;
  }
}
