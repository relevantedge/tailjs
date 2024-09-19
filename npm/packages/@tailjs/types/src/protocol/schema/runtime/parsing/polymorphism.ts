import {
  enumerate,
  forEach,
  fromEntries,
  get,
  map,
  quote,
  some,
  update,
} from "@tailjs/util";
import {
  ParsedSchemaPropertyDefinition as Property,
  SCHEMA_TYPE_PROPERTY,
  ParsedSchemaObjectType as Type,
} from "../../../..";
import {
  SchemaCensorFunction,
  SchemaValueValidator,
  VALIDATION_ERROR,
} from "../validation";

const isFullyRequired = (prop: Property) =>
  prop.required && (!prop.baseProperty || isFullyRequired(prop.baseProperty));

export type SchemaTypeDiscriminators = {
  discriminators: {
    [Property in string]: {
      discrete: boolean;
      values: {
        [Value in string]:
          | { type: Type }
          | (SchemaTypeDiscriminators & { type?: undefined });
      };
    };
  };
};

export type SchemaTypeMapper = (data: any) => Type | undefined;

export const createSchemaTypeMapper: (
  types: Type[],
  filter?: (type: Type) => boolean,
  prioritize?: string[]
) => {
  map: SchemaTypeMapper;
  selector?: SchemaTypeDiscriminators;
  mapped: Set<Type>;
  unmapped: Set<Type>;
  validation: { censor: SchemaCensorFunction; validate: SchemaValueValidator };
} = (types, filter, prioritize) => {
  if (types.length === 1 && !types[0].extendedBy.size) {
    // Single concrete type.
    const type = types[0];
    return {
      map: () => type,
      mapped: new Set(types),
      unmapped: new Set(),
      validation: {
        censor: (target, context) => type.censor(target, context, false),
        validate: (target, current, context, errors) => {
          const validated = type.validate(
            target,
            current,
            context,
            errors,
            false
          );
          if (validated != VALIDATION_ERROR) {
            validated[SCHEMA_TYPE_PROPERTY] = type.qualifiedName;
          }
          return validated;
        },
      },
    };
  }

  type TypePropertyInfo = {
    type: Type;
    props: Map<
      // Property name.
      string,
      // Values for the property.
      Set<string>
    >;
  };

  const valueMappings = new Map<string, Map<string, TypePropertyInfo[]>>();

  const registerPropertyValue = (
    info: TypePropertyInfo,
    name: string,
    value: string
  ) => {
    update(
      get(valueMappings, name, () => new Map()),
      value,
      (current) => [
        // Clear base types matches
        ...(current?.filter((props) => !props.type.extendedBy.has(info.type)) ??
          []),
        info,
      ]
    );

    get(info.props, name, () => new Set()).add(value);
  };

  const allTypes = new Map<Type, TypePropertyInfo>();

  const mapPropertyValues = (type: Type) => {
    const cached = allTypes.get(type);
    if (cached) {
      return cached;
    }

    if (type.abstract || filter?.(type) === false) return;

    const info: TypePropertyInfo = { type, props: new Map() };
    allTypes.set(type, info);

    forEach(type.properties, ([, property]) => {
      let values: string[] | undefined;

      if (
        property.required &&
        "enumValues" in property.type &&
        property.type.enumValues
      ) {
        if (!property.type.enumValues?.length) return;
        values = property.type.enumValues.map((value) => "" + value);
      } else if (isFullyRequired(property)) {
        values = ["*"];
      }

      forEach(values, (value) =>
        registerPropertyValue(info, property.name, value)
      );
    });
  };

  for (const type of types) {
    mapPropertyValues(type);
    for (const subtype of type.extendedBy) {
      mapPropertyValues(subtype);
    }
  }

  const fullyRequired = valueMappings;
  for (const [, info] of allTypes) {
    forEach(valueMappings, ([prop, values]) => {
      if (values.has("*") && !info.props.has(prop)) {
        registerPropertyValue(info, prop, "");
      }
    });
  }

  const unmapped = new Set<Type>();
  forEach(valueMappings, ([, values]) => {
    return forEach(values, ([, types]) =>
      forEach(types, ({ type }) => unmapped.add(type))
    );
  });

  const prioritized = prioritize?.length ? new Set(prioritize) : null;
  // Order properties by the number of distinct values they can have.
  // This to reduce the number of selector branches.
  const propertiesByLikelihood = [...valueMappings].sort(
    ([name1, { size: x }], [name2, { size: y }]) =>
      prioritized?.has(name1) === prioritized?.has(name2)
        ? y - x
        : prioritized?.has(name1)
        ? Number.MIN_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER
  );

  const mapped = new Set<Type>();

  const createSelector = (
    parentProps?: Map<string, string>,
    subset?: Set<Type>
  ): SchemaTypeDiscriminators | undefined => {
    let selector: SchemaTypeDiscriminators | undefined;
    for (const [prop, values] of propertiesByLikelihood) {
      if (parentProps?.has(prop) === true) {
        continue;
      } else if (!parentProps && !unmapped.size) {
        // Done. All mapped.
        break;
      }

      for (let [value, types] of values) {
        if (subset && !some(types, ({ type }) => subset.has(type))) {
          // We are only looking for disambiguating a subset of the types for a nested selector.
          // Don't branch out on the rest.
          continue;
        } else if (value === "" && !subset?.size) {
          // Only consider the absence of required property when disambiguating.
          continue;
        }

        const candidates = types.filter(
          ({ props }) =>
            !some(
              parentProps,
              ([name, value]) => props.get(name)?.has(value) !== true
            )
        );

        if (!candidates.length) {
          continue;
        }
        if (candidates.length === 1) {
          const { type } = candidates[0];
          unmapped.delete(type);
          mapped.add(type);

          ((selector ??= { discriminators: {} }).discriminators[prop] ??= {
            discrete: value !== "" && value !== "*",
            values: {},
          }).values[value] = { type };

          continue;
        }

        const childSelector = createSelector(
          new Map([...(parentProps ?? []), [prop, value]]),
          new Set(map(candidates, (candidate) => candidate.type))
        );

        if (childSelector) {
          ((selector ??= { discriminators: {} }).discriminators[prop] ??= {
            discrete: value !== "" && value !== "*",
            values: {},
          }).values[value] = childSelector;
        }
      }
    }
    return selector;
  };

  const selector = createSelector();

  const compile = (selector: SchemaTypeDiscriminators): SchemaTypeMapper => {
    const matchers = map(
      selector.discriminators,
      ([prop, { discrete, values }]): SchemaTypeMapper => {
        const lookup = fromEntries(values, ([value, selector]) => [
          value,
          selector.type ?? compile(selector),
        ]);

        return (data) => {
          const value = data[prop];

          if (value == null && !discrete) return;

          const match = lookup[discrete ? (value == null ? "" : "*") : value];
          return typeof match === "function" ? match(data) : match;
        };
      }
    );

    return (data) => {
      for (const matcher of matchers) {
        const match = matcher(data);
        return match;
      }
    };
  };

  const compiled = selector ? compile(selector) : () => undefined;

  const message = !mapped.size
    ? "The schema does not contain any valid types for this property."
    : `The value does not match ${
        mapped.size === 1 ? "the type" : "any of the types"
      } ${enumerate(quote(mapped))}.`;

  return {
    map: compiled,
    selector,
    mapped: mapped,
    unmapped: unmapped,
    validation: {
      censor: (target, context) =>
        compiled(target)?.censor(target, context, false),
      validate: (target, current, context, errors) => {
        const type = compiled(target);
        if (!type) {
          errors.push({ path: "", message, source: target });
          return VALIDATION_ERROR;
        }

        const validated = type.validate(
          target,
          current,
          context,
          errors,
          false
        );
        if (validated != VALIDATION_ERROR) {
          validated[SCHEMA_TYPE_PROPERTY] = type.qualifiedName;
        }
        return validated;
      },
    },
  };
};
