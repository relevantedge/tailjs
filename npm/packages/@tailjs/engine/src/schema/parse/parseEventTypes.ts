import {
  changeIdentifierCaseStyle,
  forEach,
  isString,
  required,
} from "@tailjs/util";
import { getRefSchema, parseError } from ".";
import { tryParseObjectComposition } from "./tryParseObjectComposition";
import { TraverseContext } from "./types";
import { SchemaSystemTypes } from "@tailjs/types";

export const parseEventTypes = (context: TraverseContext) => {
  const defs = context.node.$defs ?? context.node.definitions;
  if (!defs) {
    return;
  }

  /**
   * Events can be defined either as a type/class named `Events` with the individual event types as properties.
  /* This allows for syntax like `export type Events = {CustomClick: {foo: string}}
  /*
  /* Alternatively, events can be defined in a nested schema called `events` with the event types defined as `$defs`.
  /*
  /* Finally, a composition type named `Event` may be used to support syntax like `export type Event = EventType1 | EventType2 | ... `
  /*
  /* Specifically:
  /* `#/$defs/Events: {type: "object", properties: {Type1: ..., Type2: ...}}`
  /* `#/$defs/events: {$defs: {Type1: ..., Type2: ...}}`  
  /* `#/$defs/Event: {anyOf: [{$ref: "Type1"}, {$ref: Type2}, ...]}
  /*
  /* The event type names will be the kebab_cased equivalent of their type names, 
  /* unless they already have a const `type` property with the desired name.
  */

  const patchEvent = (name: string, eventSchema: any) => {
    if (!tryParseObjectComposition(eventSchema, context)) {
      throw parseError(
        context,
        "All event type definitions must be object types."
      );
    }

    if (eventSchema.$ref !== SchemaSystemTypes.Event) {
      const allOf: any[] = (eventSchema.allOf ??= []);
      if (!allOf.some((item) => item?.$ref === SchemaSystemTypes.Event)) {
        allOf.unshift({ $ref: SchemaSystemTypes.Event });
      }
    }

    if (!eventSchema.properties?.type) {
      (eventSchema.properties ??= {}).type = {
        const: changeIdentifierCaseStyle(name.replace(/Event$/, ""), "kebab"),
      };
    } else if (
      !isString(eventSchema.properties?.type?.const) ||
      eventSchema.properties?.type?.enum?.every(isString) === false
    ) {
      throw parseError(
        context,
        "When a type property is explicitly specified on an implicit event type, it must be either a string const or an enum with string values."
      );
    }
    return eventSchema;
  };

  forEach(
    defs.Event?.anyOf ??
      defs.Event?.oneOf ??
      defs.Events?.anyOf ??
      defs.Event?.oneOf,
    (ref) => {
      if (ref.properties || !ref.$ref) {
        throw parseError(
          context,
          "If event types are included as a union type named 'Event', it can only be composed of $refs to the the event types."
        );
      }
      patchEvent(
        ref.$ref.match(/[^#\/]+$/g)[0],
        required(
          getRefSchema(context, ref.$ref),
          `${ref.$ref} is not defined in the schema.`
        )
      );
    }
  );

  delete defs.Event;
  (defs.Events?.anyOf || defs.Events?.oneOf) && delete defs.Events;

  [defs.events?.$defs, defs.Events?.$defs, defs.Events?.properties].forEach(
    (eventDefinitions) => {
      forEach(eventDefinitions, ([name, eventSchema]) => {
        defs[name] = patchEvent(name, eventSchema);
      });
    }
  );

  delete defs.events;
  delete defs.Events;
};
