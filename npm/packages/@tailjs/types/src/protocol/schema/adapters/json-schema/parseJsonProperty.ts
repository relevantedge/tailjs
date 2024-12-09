import { isObject } from "@tailjs/util";
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
  SchemaRecordTypeDefinition,
  SchemaTypeDefinitionReference,
} from "../../../..";

export const parseJsonProperty = (
  context: ParseContext,
  assign: (property: SchemaPropertyDefinition) => void
) => {
  let property: SchemaPropertyDefinition;
  const { node } = context;
  if (isJsonObjectType(node)) {
    property = parseJsonType(context, false);
  } else {
    const propertyTypeName = node.type?.split("/").slice(-1)[0]?.toLowerCase();

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
      case "decimal":
        property = { primitive: "number" };
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
        parseJsonProperty(
          navigateContext(context, "items"),
          (items) => ((property as SchemaArrayTypeDefinition).item = items)
        );
        break;
      case "object":
        if (isObject(node.additionalProperties)) {
          property = { key: { primitive: "string" } } as any;
          parseJsonProperty(
            navigateContext(context, "additionalProperties"),
            (items) => ((property as SchemaRecordTypeDefinition).value = items)
          );
          break;
        }

      default:
        if (node.$ref) {
          property = {} as any;
          context.refs.resolve(
            node.$ref,
            (typeId) =>
              ((property as SchemaTypeDefinitionReference).reference = typeId)
          );
          break;
        }
        return contextError(context, `Unknown property type.`);
    }

    if (node.const) {
      (property as SchemaEnumTypeDefinition).enum = [node.const];
    } else if (node.enum) {
      (property as SchemaEnumTypeDefinition).enum = node.enum;
    }
  }

  if (context.parent!.node.required?.includes(context.key)) {
    property.required = true;
  }
  assign(parseAnnotations(context, property as any));
};
