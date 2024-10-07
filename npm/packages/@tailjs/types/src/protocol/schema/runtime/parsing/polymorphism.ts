import {
  array,
  collect,
  entries,
  enumerate,
  filter,
  forEach,
  fromEntries,
  get,
  isPlainObject,
  map,
  maxBy,
  StrictUnion,
  update,
  values,
} from "@tailjs/util";
import {
  hasEnumValues,
  ParsedSchemaPrimitiveType as Primitive,
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

type TypeSelector = { type: Type };
type PropertySelector = {
  property: string;
  discrete: boolean;
  alternative?: Selector;

  // Branch out on the property value.
  values: Map<string | number, Selector>;
};

type PropertyValueMap = {
  name: string;
  types: Set<Type>;
  discrete: boolean;

  values: Map<string | number, Set<Type>>;
};

type Selector = StrictUnion<TypeSelector | PropertySelector>;

let value: any;
const selectorFoo = (data: any, selector: Selector | undefined) =>
  !selector || !isPlainObject(data)
    ? undefined
    : selector.type ??
      selectorFoo(
        data,
        data[selector.property] != null
          ? selector.values[selector.discrete ? "*" : value]
          : selector.alternative
      );

const mapTypeFoo = (types: Type[]) => {
  const roots = new Set(types);
  types = [...subtypesOf(types, true)];

  const discriminatorLookup = new Map<string, PropertyValueMap>();

  for (const type of types) {
    const props = roots.has(type)
      ? // Include properties from base types that are not included.
        type.properties
      : type.ownProperties;
    let prop: Property;
    let hasOwn = false;
    for (const name in props) {
      if (!isFullyRequired((prop = props[name]))) continue;
      hasOwn ||= prop.type !== prop.baseProperty?.type;

      update(
        discriminatorLookup,
        name,
        (current) => (
          ((current ??= {
            name,
            types: new Set(),
            discrete: false,
            values: new Map(),
            // If the property is as an enum anywhere, it is discrete.
            // That means we will only match data that has one of the enum values from one of the types.
          }).discrete ||= hasEnumValues(prop.type)),
          current
        )
      );
    }
    if (!hasOwn) {
      for (const baseType of type.extends) {
        // The type does not have any properties disambiguating it from its base types.
        // A unambiguous selector is not possible unless they are abstract, so we make them.
        baseType.abstract = true;
      }
    }
  }

  const discriminators = values(discriminatorLookup);

  for (const type of types) {
    if (type.abstract) continue;

    for (const { name, types, discrete, values } of discriminators) {
      let prop: Property;
      let target: PropertyValueMap;
      if (!(prop = type.properties[name])) continue;

      for (const value of discrete
        ? (prop.type as Primitive).enumValues ?? []
        : ["*"]) {
        types.add(type);
        get(values, value, () => new Set()).add(type);
      }
    }
  }

  // Sort by the maximum number of types that can be mapped by a selector from each property.

  function mapSelector(unmapped: Set<Type>, props: PropertyValueMap[]) {
    let type: Type | undefined;
    if (unmapped.size <= 1) {
      // Single type.
      unmapped.forEach((item) => (type = item));
      return type && { type };
    }

    // Find the property that covers as many of the types as possible,
    // and resolve ties by the property with the most values to heuristically reduce the number of branches.
    let size: number;
    const [prop, overlap] = maxBy(props, (prop, current) =>
      (size = prop.types.intersection(unmapped).size) === current
        ? prop.values.size
        : size
    )!;
    if (!overlap) {
      // An unambiguous selector is impossible.
      return undefined;
    }

    const selector: PropertySelector = {
      property: prop.name,
      discrete: prop.values["*"],
      values: new Map(),
    };

    const nextProps = props.filter((other) => other !== prop);
    let remaining = new Set(unmapped);
    for (const [value, types] of prop.values) {
      const mapped = mapSelector(types.intersection(unmapped), nextProps);
      if (mapped == null) {
        // An unambiguous selector is impossible.
        return mapped;
      }
      selector.values.set(value, mapped);
      remaining = remaining.difference(types);
    }
    if (remaining.size) {
      selector.alternative = mapSelector(remaining, nextProps);
    }
  }
  return mapSelector(array(propertyLookup.values()));
};

const buildFoo = (
  types: Type[],
  properties: Map<string, PropertyValueMap>,
  rootProperty?: string
) => {
  const props = [...properties].sort(
    (x, y) => y[1].values!.size - x[1].values!.size
  );

  function mapOne(
    unmapped: Set<Type>,
    pendingSelectors: [name: string, values: PropertyValueMap][]
  ) {
    let intersection: Set<Type>;
    const candidates = map(pendingSelectors, (item) =>
      (intersection = item[1].types.intersection(unmapped)).size
        ? [item, intersection]
        : undefined
    ).sort(([, x], [, y]) => y.size - x.size);

    for (const [name, info] of pendingSelectors) {
    }
  }
};

const pickBestSelector = (selectors: Iterable<Selector>) => {
  let best: Selector | undefined;
  for (const selector of selectors) {
    if (selector.type) {
      // A direct match is always best.
      return selector;
    }
    if (
      selector.property &&
      (!best?.property || selector.mapped > best.mapped)
    ) {
      // A selector with many values is more efficient than going through a lot of nested selectors.
      best = selector;
    }
  }
  return best;
};

const finishFoos = (selectors: Iterable<Selector>, unmapped: Set<Type>) => {
  let best = pickBestSelector(selectors);
  if (best?.property) {
    for (const [name, selector] of best.values) {
      if (selector.type) {
        unmapped.delete(selector.type);
        continue;
      }
    }
  }

  return best;
};

// const selectorFoo = (data: any, selector: Selector | undefined) => {
//   if (!selector?.property) return selector?.type;

//   let value = data[selector.property];
//   let subSelector: Selector | undefined;
//   if( selector.values){
//     return selectorFoo(data, selector.values[value] ?? selector.subSelector);
//   }
//   //return
//   return value != null ? selector.values && (subSelector= selector.values?.[value]) ? selectorFoo

//   return value != null && selector.type
//     ? selector.type
//     : selectorFoo(
//         data,
//         value == null || !(subSelector = selector.values?.[value])
//           ? selector.subSelector
//           : subSelector
//       );
// };

type PropertyValueBranches = {
  values: { [Value in string]?: SchemaTypeSelector };
  other?: SchemaTypeSelector;
};

export type SchemaTypeSelector = StrictUnion<
  { baseType: Type; mapped: Set<Type> } & (
    | { match: Type }
    | { selectors: PropertyValueBranches; default?: SchemaTypeSelector }
  )
>;

export type SchemaTypeMapper = (data: any) => Type | undefined;

export const isAssignableTo = (type: Type, baseType: Type) =>
  type === baseType || type.extendsAll.has(baseType);

const sortedSymbol = Symbol();

/** Performs a topological sort on the given types, so a type that extends another type will come after. */
export const sortByInheritance = (source: Iterable<Type>): readonly Type[] => {
  if (source[sortedSymbol]) return source as Type[];

  const types = array(source);
  for (let i = 0; i < types.length - 1; i++) {
    if (isAssignableTo(types[i], types[i + 1])) {
      for (let j = i; j >= 0 && isAssignableTo(types[j], types[j + 1]); j--) {
        // Keep bubbling the type up, as long
        [types[j + 1], types[j]] = [types[j], types[j + 1]];
      }
    }
  }
  types[sortedSymbol] = true;
  return types;
};

const rootsSymbol = Symbol();

/** Returns the types that do not extend any other type.*/
export const getRootTypes = (types: Iterable<Type>): readonly Type[] =>
  types[rootsSymbol] ??
  ((types = sortByInheritance(types))[rootsSymbol] = (types as Type[]).filter(
    (type, i) => !i || !type.extendsAll.has(types[i - 1])
  ));

const leavesSymbol = Symbol();
export const getLeaves = (types: Iterable<Type>): readonly Type[] =>
  types[leavesSymbol] ??
  ((types = sortByInheritance(types))[rootsSymbol] = (types as Type[]).filter(
    (type) => !type.extendedBy.length
  ));

export const baseTypesOf = (types: Type | Iterable<Type>, orSelf = false) =>
  collect(types, (type) => type.extends, orSelf);

export const subtypesOf = (types: Type | Iterable<Type>, orSelf = false) =>
  collect(types, (type) => type.extendedBy, orSelf);

export const createSchemaTypeMapper: (
  types: readonly Type[],
  prioritize?: string[],
  subtypeFilter?: (type: Type) => any
) => {
  map: SchemaTypeMapper;
  selector?: SchemaTypeSelector;
  mapped: Set<Type>;
  unmapped: Set<Type>;
  validation: { censor: SchemaCensorFunction; validate: SchemaValueValidator };
} = (types, prioritize, subtypeFilter) => {
  if (types.length < 2 && !types[0].extendedBy.length) {
    // Fast path for single or no type.
    const type = types[0];
    return {
      map: () => type,
      mapped: new Set(types),
      unmapped: new Set(),
      validation: {
        censor: type
          ? (target, context) => type.censor(target, context, false)
          : () => {},
        validate: type
          ? (target, current, context, errors) => {
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
            }
          : () => {},
      },
    };
  }

  type TypePropertyInfo = {
    type: Type;
    props: Map<
      // Property name.
      string,
      // Values for the property.
      Set<string | number>
    >;
  };

  /** Common variable when looking up cached type info to save code lines. */

  let info: TypePropertyInfo;
  const typeInfos = new Map<Type, TypePropertyInfo | null>();
  const discriminators = new Map<string, { discrete: boolean }>();
  const valueMappings = new Map<
    string,
    {
      types: Set<Type>;
      values: Map<string | number, Map<Type, TypePropertyInfo>>;
    }
  >();

  // Expand all subtypes and sort topologically.
  types = sortByInheritance(
    filter(
      subtypesOf(types, true),
      (type) => !type.abstract && subtypeFilter?.(type) !== false
    )
  );

  const roots = new Set(getRootTypes(types));

  for (const type of getLeaves(types)) {
    // Leaves first. Then we can avoid unnecessary base types.
    typeInfos.set(type, (info = { type, props: new Map() }));
    let hasOwn = false;
    let prop: Property;
    let values: (string | number)[];

    for (const [key, { discrete }] of discriminators) {
      if (!(prop = type.properties[key])) {
        continue;
      }

      for (const value of discrete
        ? (prop.type as Primitive).enumValues ?? []
        : ["*"]) {
        hasOwn =
          !discrete ||
          // The type might have overridden an enum property without changing the enum values
          // (for example, to change usage).
          prop.type !== prop.baseProperty?.type ||
          hasOwn;

        const mapped = get(valueMappings, key, () => ({
          types: new Set(),
          values: new Map(),
        }));
        mapped.types.add(type);
        get(mapped.values, value, () => new Map()).set(type, info);
        get(info.props, key, () => new Set()).add(value);
      }
    }

    if (hasOwn) {
      // Do not process base types if the type has no new distinguishing property values.
      // This means they will have exactly the same discriminators, and the base types can safely be assumed abstract.
      for (const baseType of type.extends) {
        if (typeInfos.has(baseType)) continue;
      }
    }
  }

  const unmapped = new Set(typeInfos.keys());
  const prioritized = new Set(prioritize);

  // Order properties by the number of types they cover to reduce the size of the tree.
  //
  const selectorProps = [...valueMappings].sort(
    (x, y) =>
      +prioritized.has(y[0]) - +prioritized.has[x[0]] ||
      y[1].types.size - x[1].types.size
  );

  const mapped = new Set<Type>();
  const createSelector = (
    unmapped: Set<Type>,
    exclude: Map<string, string>
  ): SchemaTypeSelector | undefined => {
    let selector: SchemaTypeSelector | undefined;
    let propValues: PropertyValueBranches | undefined;
    for (const [prop, values] of selectorProps) {
      if (exclude?.has(prop) === true) {
        continue;
      }

      if (!exclude && !unmapped.size) {
        // Done. All mapped.
        break;
      }

      for (let [value, types] of values.values) {
        let candidates = filter(types.values(), (info) => types.has(type));

        // if (types && !some(types, ([type]) => types.has(type))) {
        //   // We are only looking for disambiguating a subset of the types for a nested selector.
        //   // Don't branch out on the rest.
        //   continue;
        // } else if (value === "" && !types?.size) {
        //   // Only consider the absence of required property when disambiguating.
        //   continue;
        // }

        // let candidates = map(types, ([, info]) =>
        //   !some(
        //     exclude,
        //     ([name, value]) => info.props.get(name)?.has(value) !== true
        //   )
        //     ? info
        //     : undefined
        // );

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
          new Map([...(exclude ?? []), [prop, value]]),
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
        propValues.other = { type: fallback };

        removeValueMappings(fallback);
        unmapped.delete(fallback);
        mapped.add(fallback);
      }

      if (propValues) {
        ((selector ??= {}).subtypes ??= {})[prop] = propValues;
        let allTypes: Type[] | null = [];
        for (const [, { other: fallback, values }] of entries(
          selector.subtypes
        )) {
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
        allTypes && (selector.baseType = sortByInheritance(allTypes));
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
      ([prop, { other: fallback, values }]): SchemaTypeMapper => {
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
