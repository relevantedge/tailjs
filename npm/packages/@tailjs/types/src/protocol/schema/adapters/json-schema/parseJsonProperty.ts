import { isArray, isObject } from "@tailjs/util";
import {
  contextError,
  isJsonObjectType,
  navigateContext,
  parseAnnotations,
  ParseContext,
  parseJsonType,
} from ".";
import {
  SchemaArrayTypeDefinition,
  SchemaEnumTypeDefinition,
  SchemaPropertyDefinition,
  SchemaPropertyTypeDefinition,
  SchemaRecordTypeDefinition,
  SchemaTypeDefinitionReference,
  SchemaUnionTypeDefinition,
} from "../../../..";

export const parseJsonProperty = (
  context: ParseContext,
  assign: (property: SchemaPropertyDefinition) => void
) => {
  let property: SchemaPropertyDefinition | undefined;
  const { node } = context;
  for (const prop of ["anyOf", "type"]) {
    if (isArray(node[prop])) {
      property = { union: [] };
      const unionContext = navigateContext(context, prop);
      (unionContext.node as any[]).forEach((value, i) => {
        parseJsonProperty(
          navigateContext(
            unionContext,
            i,
            typeof value === "string" ? { type: value } : undefined
          ),
          (unionType) =>
            (property as SchemaUnionTypeDefinition).union.push(unionType)
        );
      });
      break;
    }
  }

  if (!property) {
    if (isJsonObjectType(node)) {
      property = parseJsonType(context, false);
    } else {
      const propertyTypeName = (node.type ?? node["$ref"])
        ?.split("/")
        .slice(-1)[0]
        ?.toLowerCase();

      switch (propertyTypeName) {
        case "string":
          const format = node["format"];
          switch (format) {
            case "date-time":
              property = { primitive: "datetime" };
              break;
            case "date":
              property = { primitive: "date" };
              break;
            case "email":
            case "urn":
            case "uri":
            case "url":
              property = { primitive: "string", format };
              break;
            case "uuid":
              property = { primitive: "uuid" };
              break;
            default:
              property = { primitive: "string" };
              break;
          }
          break;
        case "float":
        case "number":
          property = { primitive: "number" };
          break;
        case "percentage":
        case "decimal":
          property = { primitive: "number", format: propertyTypeName };
          break;
        case "boolean":
          property = { primitive: "boolean" };
          break;
        case "integer":
          property = { primitive: "integer" };
          break;
        case "timestamp":
          property = { primitive: "timestamp" };
          break;
        case "date":
          property = { primitive: "date" };
          break;
        case "datetime":
          property = { primitive: "datetime", format: "iso" };
          break;
        case "uuid":
          property = { primitive: "uuid" };
          break;
        case "duration":
          property = { primitive: "duration" };
          break;
        case "array":
          property = {} as any;

          parseJsonProperty(navigateContext(context, "items"), (items) => {
            return ((property as SchemaArrayTypeDefinition).item = items);
          });
          break;
        case "object":
          if (isObject(node.additionalProperties)) {
            property = { key: { primitive: "string" } } as any;
            parseJsonProperty(
              navigateContext(context, "additionalProperties"),
              (items) =>
                ((property as SchemaRecordTypeDefinition).value = items)
            );
            break;
          }

        default:
          if (node.$ref) {
            property = {} as any;
            if (context.parent!.parent!.node.required?.includes(context.key)) {
              property!.required = true;
            }
            context.refs.resolve(node.$ref, (typeId, type) => {
              if ("properties" in type) {
                (property as SchemaTypeDefinitionReference).reference = typeId;
                assign(property!);
              } else {
                assign({ ...type });
              }
            });
            return;
          }
          return contextError(context, `Unknown property type.`);
      }

      if (node.const) {
        (property as SchemaEnumTypeDefinition).enum = [node.const];
      } else if (node.enum) {
        (property as SchemaEnumTypeDefinition).enum = node.enum;
      }
    }
  }

  if (context.parent!.parent!.node.required?.includes(context.key)) {
    property!.required = true;
  }

  assign(parseAnnotations(context, property as any));
};
