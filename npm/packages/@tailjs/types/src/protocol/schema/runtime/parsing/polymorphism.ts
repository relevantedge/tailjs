import {
  entries,
  enumerate,
  first,
  forEach,
  fromEntries,
  get,
  map,
  quote,
  some,
  update,
} from "@tailjs/util";
import {
  hasEnumValues,
  ParsedSchemaPrimitiveType,
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

const getCommonDenominator = (types: Type[]): Type | undefined => {
  if (types.length <= 1) return types[0];
  for (let i = 0; i < types.length; i++) {
    let all = true;
    for (let j = 0; j < types.length; j++) {
      if (i !== j && !types[i].extendedBy.has(types[j])) {
        all = false;
        if (j > i) {
          i = j - 1;
        }
        break;
      }
    }
    if (all) return types[i];
  }
};

type PropertyValueBranches = {
  values: { [Value in string]?: SchemaTypeSelector };
  fallback?: SchemaTypeSelector;
};

export type SchemaTypeSelector =
  | {
      type: Type;
      baseType?: undefined;
      subtypes?: undefined;
    }
  | {
      type?: undefined;
      baseType?: Type;
      subtypes?: {
        [Property in string]: PropertyValueBranches;
      };
    };

export type SchemaTypeMapper = (data: any) => Type | undefined;

function* descendantsOrSelf(types: Type | Iterable<Type>): Iterable<Type> {
  if (Symbol.iterator in types) {
    for (const type of types) {
      yield* descendantsOrSelf(type);
    }
  } else {
    yield types;
    yield* types.extendedBy;
  }
}

export const traverseSelectors = (
  selector: SchemaTypeSelector | undefined,
  action: (
    selector: SchemaTypeSelector,
    prop: string,
    value: string | undefined
  ) => void
): void =>
  forEach(selector?.subtypes, ([prop, { fallback, values }]) => {
    forEach(values, ([value, selector]) => {
      selector && action(selector, prop, value);
      traverseSelectors(selector, action);
    });
    fallback && action(fallback, prop, undefined);
  });

function* ancestors(
  types: Type | Iterable<Type>,
  seen = new Set<Type>()
): Iterable<Type> {
  if (Symbol.iterator in types) {
    for (const type of types) {
      yield* ancestors(type, seen);
    }
  } else {
    for (const baseType of types.extendedBy) {
      if (!seen.has(baseType)) {
        seen.add(baseType);
        yield* ancestors(baseType, seen);
      }
    }
  }
}

export const createSchemaTypeMapper: (
  types: Type[],
  filter?: (type: Type) => boolean,
  prioritize?: string[]
) => {
  map: SchemaTypeMapper;
  selector?: SchemaTypeSelector;
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

  const valueMappings = new Map<
    string,
    Map<string, Map<Type, TypePropertyInfo>>
  >();

  const typeInfos = new Map<Type, TypePropertyInfo | null>();

  const removeValueMappings = (type: Type | TypePropertyInfo) => {
    const info = "type" in type ? type : typeInfos.get(type);
    forEach(info?.props, ([prop, values]) =>
      forEach(values, (value) =>
        valueMappings.get(prop)?.get(value)?.delete(info!.type)
      )
    );
  };

  const discriminators = new Map<string, { discrete: boolean }>();
  const roots = new Set(types);
  for (const type of descendantsOrSelf(types)) {
    forEach(
      roots.has(type) ? type.properties : type.ownProperties,
      ([key, prop]) =>
        isFullyRequired(prop) &&
        update(discriminators, key, (current) => ({
          discrete: current?.discrete || hasEnumValues(prop.type),
        }))
    );
  }

  const mapPropertyValues = (type: Type) => {
    const cached = typeInfos.get(type);
    if (cached) {
      return cached;
    }

    if (type.abstract || filter?.(type) === false) {
      typeInfos.set(type, null);
      return null;
    }

    // Make sure base types are parsed.
    forEach(type.extends, mapPropertyValues);

    const info: TypePropertyInfo = { type, props: new Map() };
    typeInfos.set(type, info);

    let hasOwn = false;
    for (const [key, { discrete }] of discriminators) {
      const prop = type.properties[key];
      if (!prop) continue;
      forEach(
        discrete ? (prop.type as ParsedSchemaPrimitiveType).enumValues : ["*"],
        (value) => {
          hasOwn = true;
          value = value.toString();
          get(
            get(valueMappings, key, () => new Map()),
            value,
            () => new Map()
          ).set(type, info);
          get(info.props, key, () => new Set()).add(value);
        }
      );
    }
    if (!hasOwn) {
      // Base types does not have any discriminators, since the subtype has inherited them all.
      // Remove base types from value mappings.
      for (const baseType of ancestors(type)) {
        removeValueMappings(baseType);
      }
    }
  };

  for (const type of descendantsOrSelf(types)) {
    mapPropertyValues(type);
  }

  let unmapped = new Set<Type>();
  forEach(valueMappings, ([, values]) =>
    forEach(values, ([, types]) =>
      forEach(types, ([type]) => unmapped.add(type))
    )
  );
  for (const type of descendantsOrSelf(types)) {
    if (type.extendedBy.size === 0 && !unmapped.has(type)) {
      // Leaf type without required properties, including properties from base types.
      unmapped.add(type);
    }
  }

  const prioritized = prioritize?.length ? new Set(prioritize) : null;
  // Order properties by the number of distinct values they can have (and explicit prioritization).
  // This to reduce the number of selector trees.
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
  ): SchemaTypeSelector | undefined => {
    let selector: SchemaTypeSelector | undefined;
    for (const [prop, values] of propertiesByLikelihood) {
      if (parentProps?.has(prop) === true) {
        continue;
      }

      let propValues: PropertyValueBranches | undefined;

      if (!parentProps && !unmapped.size) {
        // Done. All mapped.
        break;
      }
      // Capture the types that were mapped before we branch out on the property.
      // When done, the mapped types not in this set,
      const previouslyMapped = [...(subset ?? unmapped)];

      for (let [value, types] of values) {
        if (subset && !some(types, ([type]) => subset.has(type))) {
          // We are only looking for disambiguating a subset of the types for a nested selector.
          // Don't branch out on the rest.
          continue;
        } else if (value === "" && !subset?.size) {
          // Only consider the absence of required property when disambiguating.
          continue;
        }

        let candidates = map(types, ([, info]) =>
          !some(
            parentProps,
            ([name, value]) => info.props.get(name)?.has(value) !== true
          )
            ? info
            : undefined
        );

        if (!candidates.length) {
          continue;
        }
        if (candidates.length === 1) {
          const { type } = candidates[0];

          // The type will now have been mapped for this value,
          unmapped.delete(type);
          mapped.add(type);
          types.delete(type);
          (propValues ??= { values: {} }).values[value] = { type };
          continue;
        }

        const childSelector = createSelector(
          new Map([...(parentProps ?? []), [prop, value]]),
          new Set(map(candidates, (candidate) => candidate.type))
        );

        if (childSelector) {
          (propValues ??= { values: {} }).values[value] = childSelector;
        }
      }
      const stillMissing = previouslyMapped.filter((type) => !mapped.has(type));

      if (stillMissing.length === 1 && propValues) {
        // The type will now be fully mapped in the "spill-over" bucket.
        const fallback = stillMissing[0];
        propValues.fallback = { type: fallback };

        removeValueMappings(fallback);
        unmapped.delete(fallback);
        mapped.add(fallback);
      }

      if (propValues) {
        ((selector ??= {}).subtypes ??= {})[prop] = propValues;
        let allTypes: Type[] | null = [];
        for (const [, { fallback, values }] of entries(selector.subtypes)) {
          fallback?.type && allTypes.push(fallback.type);
          for (const [, selector] of entries(values)) {
            if (selector?.type) {
              allTypes.push(selector.type);
            } else if (selector?.baseType) {
              allTypes.push(selector.baseType);
            } else {
              allTypes = null;
              break;
            }
          }
          if (!allTypes) {
            break;
          }
        }
        allTypes && (selector.baseType = getCommonDenominator(allTypes));
      }
    }
    return selector;
  };

  const selector = createSelector();

  const compile = (
    selector: SchemaTypeSelector,
    defaultType?: Type
  ): SchemaTypeMapper => {
    const matchers = map(
      selector.subtypes!,
      ([prop, { fallback, values }]): SchemaTypeMapper => {
        const lookup = fromEntries(values, ([value, selector]) => [
          value,
          selector!.type ?? compile(selector!),
        ]);

        const discrete = discriminators.get(prop)?.discrete === true;
        const fallbackType = fallback?.type;
        return (data) => {
          const value = data[prop];
          const match =
            (value == null ? undefined : lookup[discrete ? value : "*"]) ??
            fallbackType;
          return typeof match === "function"
            ? match(data) ?? defaultType
            : match;
        };
      }
    );

    return (data) => {
      for (const matcher of matchers) {
        const match = matcher(data);
        if (match) {
          return match;
        }
      }
      return undefined;
    };
  };

  let globalFallback: Type | undefined;
  if (unmapped.size) {
    // If there is a single unmapped type where all the other ones are base types,
    // we use that as a global fallback.
    let concreteUnmapped = [...unmapped];
    concreteUnmapped = concreteUnmapped.filter(
      (type) => !concreteUnmapped.some((other) => type.extendedBy.has(other))
    );
    if (concreteUnmapped.length === 1) {
      globalFallback = concreteUnmapped[0];
    }
    forEach(unmapped, (type) => mapped.add(type));
    unmapped.clear();
  }

  let mapper = selector
    ? compile(selector, globalFallback)
    : () => globalFallback;

  if (unmapped.size) {
    console.warn(
      `The type${unmapped.size > 1 ? "s" : ""} ${enumerate(
        unmapped
      )} cannot be disambiguated by required property values.

Consider marking the types that cannot be used for data directly abstract, or add a unique required property/enum value to the types${
        "" //
      }indented for data to disambiguate them.`
    );
  }

  const message = !mapped.size
    ? "The schema does not contain any valid types for this property."
    : `The value does not match ${
        mapped.size === 1 ? "the type" : "any of the types"
      } ${enumerate(mapped)}.`;

  return {
    map: mapper,
    selector,
    mapped: mapped,
    unmapped: unmapped,
    validation: {
      censor: (target, context) => {
        const type = mapper(target);
        return type?.censor(target, context, false);
      },
      validate: (target, current, context, errors) => {
        const type = mapper(target);
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
