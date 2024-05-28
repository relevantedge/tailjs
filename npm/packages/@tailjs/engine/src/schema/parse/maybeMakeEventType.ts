import { SchemaSystemTypes } from "@tailjs/types";
import { changeIdentifierCaseStyle } from "@tailjs/util";
import { addProperties, getRefType, parseCompositions } from ".";
import { ParsedType } from "./types";

/**
 * Makes a type an event type if it should be but is currently not.
 */
export const maybeMakeEventType = (type: ParsedType) => {
  if (type.name.endsWith("Event")) {
    const systemEventType = getRefType(
      type.composition.context,
      SchemaSystemTypes.Event
    );

    if (
      systemEventType &&
      type !== systemEventType &&
      !type.extendsAll?.has(systemEventType)
    ) {
      const eventSchema = type.context.node;

      (eventSchema.allOf ??= []).unshift({ $ref: SchemaSystemTypes.Event });
      (eventSchema.properties ??= {}).type ??= {
        const: changeIdentifierCaseStyle(
          type.name.replace(/Event$/, ""),
          "kebab"
        ),
      };

      (type.extends ??= new Set()).add(systemEventType);
      (type.extendsAll ??= new Set()).add(systemEventType);

      addProperties(
        type,
        (type.composition = parseCompositions(eventSchema, type.context))
      );
      return true;
    }
  }
  return false;
};
