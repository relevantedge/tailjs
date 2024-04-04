import {
  changeIdentifierCaseStyle,
  forEach,
  isString,
  throwError,
  validate,
} from "@tailjs/util";
import { TraverseContext } from "./types";
import { systemTypes } from "../consts";
import { tryParseObjectComposition } from "./tryParseObjectComposition";

export const parseEventTypes = (context: TraverseContext) => {
  const defs = context.node.$defs;
  if (!defs) {
    return;
  }

  // Events can be defined either as a type/class named `Events` with the individual event types as properties.
  // Alternatively, events can be defined in a nested schema called `events` with the event types defined as `$defs`.
  //
  // Specifically:
  // `#/$defs/Events: {type: "object", properties: {Type1: ..., Type2: ...}}
  // `#/$defs/events: {$defs: {Type1: ..., Type2: ...}}
  //
  // The event type names will be the kebab_cased equivalent of their type names.

  forEach(
    [defs.events?.$defs ?? defs.Events?.$defs ?? defs.Events?.properties],
    (eventDefs) =>
      forEach(eventDefs, ([name, eventSchema]) => {
        if (!tryParseObjectComposition(eventSchema, context)) {
          throwError("All event type definitions must be object types.");
        }

        if (eventSchema.$ref !== systemTypes.event) {
          const allOf: any[] = (eventSchema.allOf ??= []);
          if (!allOf.some((item) => item?.$ref === systemTypes.event)) {
            allOf.unshift({ $ref: systemTypes.event });
          }
        }

        if (!eventSchema.properties?.type) {
          (eventSchema.properties ??= {}).type = {
            const: changeIdentifierCaseStyle(name, "kebab"),
          };
        } else if (
          isString(eventSchema.properties?.type?.const) ||
          !eventSchema.properties?.type?.enum.every(isString)
        ) {
          throwError(
            "When a type property is explicitly specified on an implicit event type, it must be either a string const or an enum with string values."
          );
        }

        defs[name] = eventSchema;
      })
  );

  delete defs["Events"];
  delete defs["events"];
};
