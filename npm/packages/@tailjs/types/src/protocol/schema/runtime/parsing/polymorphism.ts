import {
  all,
  collect,
  distinct,
  filter,
  first,
  forEach,
  get,
  itemize,
  join,
  map,
  push,
  skip,
  some,
  sort,
  throwError,
  stringify,
  topoSort,
} from "@tailjs/util";
import {
  SchemaObjectType,
  SchemaPrimitiveType,
  SchemaObjectType as Type,
} from "../../../..";
import {
  formatErrorSource,
  handleValidationErrors,
  SchemaCensorFunction,
  SchemaValueValidator,
  VALIDATION_ERROR_SYMBOL,
} from "../validation";

export type SchemaTypeMapper = (data: any) => Type | undefined;

export const isAssignableTo = (type: Type, baseType: Type) =>
  type === baseType || type.extendsAll.has(baseType);

export const baseTypesOf = (types: Type | Iterable<Type>, orSelf = false) =>
  collect(types, (type) => type.extends, orSelf);

export const subtypesOf = (types: Type | Iterable<Type>, orSelf = false) =>
  collect(types, (type) => type.extendedBy, orSelf);

/**
 * If all types in a set of types is assignable to the same type, and the type has no other concrete subtypes,
 * this is the "common base type".
 */
export const findCommonBaseType = (types: Type[]): Type | undefined => {
  let type: Type | undefined = types[0];
  for (let i = 1, n = types.length; type && i < n; i++) {
    const other = types[i];
    if (isAssignableTo(type, other)) {
      type = other;
    } else if (!isAssignableTo(other, type)) {
      const shared = type.extendsAll.intersection(other.extendsAll);
      type = first(shared, (baseType) =>
        all(
          baseType.extendedByAll,
          (subtype) => subtype === type || subtype === other || subtype.abstract
        )
      );
    }
  }
  return type;
};

export type SchemaTypeSelector = (value: {} & object) => Type | undefined;
type DiscriminatorValue = string | number | symbol;

const anyValue = Symbol();

export const createAbstractTypeValidator = (
  type: SchemaObjectType
): {
  censor: SchemaCensorFunction;
  validate: SchemaValueValidator;
} => ({
  censor: () => undefined,
  validate: (value: any, _current, _context, errors) =>
    handleValidationErrors((errors) => {
      errors.push({
        path: "",
        type: null,
        source: value,
        message: `The abstract type ${type.id} cannot be instantiated.`,
      });
      return VALIDATION_ERROR_SYMBOL as any;
    }, errors),
});

export const createSchemaTypeMapper = (
  rootTypes: Iterable<Type>
): {
  match: SchemaTypeSelector;
  mapped: Set<Type>;
  unmapped: Type[];
  censor: SchemaCensorFunction;
  validate: SchemaValueValidator;
} => {
  const discriminators = new Map<string, Map<DiscriminatorValue, Type[]>>();

  const types = topoSort(
    filter(subtypesOf(rootTypes, true), (type) => !type.abstract),
    (type) => type.extends
  );

  if (!types.length) {
    return {
      match: () => undefined,
      mapped: new Set(),
      unmapped: [],
      // Remember only the first abstract root type is mentioned in the error, even if there are more.
      ...createAbstractTypeValidator(rootTypes[0]),
    };
  }

  let selector: SchemaTypeSelector;
  const mapped = new Set<Type>();

  if (types.length === 1) {
    mapped.add(types[0]);
    selector = () => types[0];
  } else {
    forEach(types, (type) =>
      forEach(type.properties, ([name, prop]) =>
        forEach(
          prop.required &&
            ((prop.type as SchemaPrimitiveType)?.enumValues ?? [anyValue]),
          (value) =>
            get(
              get(discriminators, name, () => new Map()),
              value,
              () => []
            ).push(type)
        )
      )
    );
    forEach(discriminators, ([, value]) => {
      // If there are more than 1 one value, it means there is at least one enum value.
      value.size > 1 && value.delete(anyValue);
      return forEach(value, ([, types]) => push(mapped, ...types));
    });

    const isOptional = (type: Type, name: string) =>
      type.properties[name] && !type.properties[name].required;

    const maybeOptional = distinct(
      map(discriminators, ([name]) =>
        some(mapped, (type) => isOptional(type, name)) ? name : skip
      )
    );
    const properties = sort(
      sort(discriminators, ([, value]) => value.size, true),
      ([name]) => maybeOptional.has(name)
    );

    const mapSelector = (
      index: number,
      pending: Type[],
      pathValues: (DiscriminatorValue | undefined)[] = []
    ): SchemaTypeSelector => {
      if (!pending.length) {
        throwError("INV: types.length > 0");
      } else if (pending.length === 1) {
        return () => pending[0];
      }
      if (index >= properties.length) {
        const valuePath = join(pathValues, (value, i) =>
          value == null
            ? skip
            : `${properties[i][0]}=${
                typeof value === "symbol" ? "*" : stringify(value)
              }`
        );
        return throwError(
          `The types ${itemize(
            map(pending, (type) => type.name),
            "and"
          )} can not be disambiguated by${
            valuePath ? " additional" : ""
          } values of required properties${
            valuePath ? ` when ${valuePath}` : ""
          } (root type(s): ${itemize(
            rootTypes
          )}) - did you forget to mark a base type abstract?.`
        );
      }

      const [discriminatorName, discriminatorValues] = properties[index];

      const selectorMap = new Map<
        string | number | symbol,
        SchemaTypeSelector
      >();

      const remaining = new Set(pending);
      const mapped = new Set<Type>();
      forEach(discriminatorValues, ([value, typesForValue]) => {
        const remainingForValue = filter(typesForValue, remaining);

        if (
          !remainingForValue.length ||
          some(pending, (pendingType) =>
            isOptional(pendingType, discriminatorName)
          )
        ) {
          // There are no remaining types for the value, or at least one of the pending types has an optional value for the discriminator
          // which means it is not usable on this property path.
          return;
        }
        selectorMap.set(
          value,
          mapSelector(index + 1, remainingForValue, [...pathValues, value])
        );
        forEach(remainingForValue, (type) => mapped.add(type));
      });

      const mapUnmatched =
        mapped.size < remaining.size
          ? mapSelector(index + 1, filter(pending, mapped, true), [
              ...pathValues,
              undefined,
            ])
          : undefined;

      return (value) => {
        const lookupValue = value?.[discriminatorName];
        return (
          (lookupValue != null &&
            (selectorMap.get(lookupValue as any) ??
              selectorMap.get(anyValue))) ||
          mapUnmatched
        )?.(value);
      };
    };
    selector = mapSelector(0, types);
  }
  const errorMessage = itemize(
    types,
    "or",
    (list, n) =>
      ` does not match the ${
        n > 1 ? "any of the types" : "the type"
      } ${list} or any of ${n > 1 ? "their" : "its"} subtypes.`
  );

  const unmapped = filter(types, mapped, true);

  return {
    match: selector,
    censor: (value, context) =>
      value != null ? selector(value)?.censor(value, context, false) : value,
    mapped,
    unmapped,
    validate: (value: any, current, context, errors) =>
      handleValidationErrors((errors) => {
        if (value == null) return value;
        const type = selector(value);
        if (!type) {
          errors.push({
            path: "",
            type: null,
            source: value,
            message: formatErrorSource(value) + errorMessage,
          });
          return VALIDATION_ERROR_SYMBOL;
        }
        return type.validate(value, current, context, errors, false);
      }, errors),
  };
};
