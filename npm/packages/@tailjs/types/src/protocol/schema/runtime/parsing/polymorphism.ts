import {
  all2,
  assign2,
  collect2,
  enumerate2,
  filter2,
  first2,
  forEach2,
  get2,
  join2,
  map2,
  set2,
  skip2,
  some2,
  sort2,
  throwError,
  toJSON2,
  topoSort2,
} from "@tailjs/util";
import {
  ParsedSchemaPrimitiveType,
  ParsedSchemaPropertyDefinition,
  ParsedSchemaObjectType as Type,
} from "../../../..";
import {
  SchemaCensorFunction,
  SchemaValueValidator,
  VALIDATION_ERROR,
} from "../validation";

export type SchemaTypeMapper = (data: any) => Type | undefined;

export const isAssignableTo = (type: Type, baseType: Type) =>
  type === baseType || type.extendsAll.has(baseType);

export const baseTypesOf = (types: Type | Iterable<Type>, orSelf = false) =>
  collect2(types, (type) => type.extends, orSelf);

export const subtypesOf = (types: Type | Iterable<Type>, orSelf = false) =>
  collect2(types, (type) => type.extendedBy, orSelf);

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
      type = first2(shared, (baseType) =>
        all2(
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
  const types = topoSort2(
    filter2(subtypesOf(rootTypes, true), (type) => !type.abstract),
    (type) => type.extends
  );

  let selector: SchemaTypeSelector;
  const mapped = new Set<Type>();

  if (types.length === 1) {
    mapped.add(types[0]);
    selector = () => types[0];
  } else {
    forEach2(types, (type) =>
      forEach2(type.properties, ([name, prop]) =>
        forEach2(
          prop.required &&
            ((prop.type as ParsedSchemaPrimitiveType)?.enumValues ?? [
              anyValue,
            ]),
          (value) =>
            get2(
              get2(discriminators, name, () => new Map()),
              value,
              () => []
            ).push(type)
        )
      )
    );
    forEach2(discriminators, ([, value]) => {
      // If there are more than 1 one value, it means there is at least one enum value.
      value.size > 1 && value.delete(anyValue);
      return forEach2(value, ([, types]) => assign2(mapped, types));
    });

    const isOptional = (type: Type, name: string) =>
      type.properties[name] && !type.properties[name].required;

    const maybeOptional = set2(
      map2(discriminators, ([name]) =>
        some2(mapped, (type) => isOptional(type, name)) ? name : skip2
      )
    );
    const properties = sort2(
      sort2(discriminators, ([, value]) => value.size, true),
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
        const valuePath = join2(pathValues, (value, i) =>
          value == null
            ? skip2
            : `${properties[i][0]}=${
                typeof value === "symbol" ? "*" : toJSON2(value)
              }`
        );
        return throwError(
          `The types ${enumerate2(
            map2(pending, (type) => type.name),
            "and"
          )} can not be disambiguated by${
            valuePath ? " additional" : ""
          } values of required properties${
            valuePath ? ` when ${valuePath}` : ""
          } - did you forget to mark a base type abstract?.`
        );
      }

      const [discriminatorName, discriminatorValues] = properties[index];

      const selectorMap = new Map<
        string | number | symbol,
        SchemaTypeSelector
      >();

      const remaining = new Set(pending);
      const mapped = new Set<Type>();
      forEach2(discriminatorValues, ([value, typesForValue]) => {
        const remainingForValue = filter2(typesForValue, remaining);

        if (
          !remainingForValue.length ||
          some2(pending, (pendingType) =>
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
        forEach2(remainingForValue, (type) => mapped.add(type));
      });

      const mapUnmatched =
        mapped.size < remaining.size
          ? mapSelector(index + 1, filter2(pending, mapped, true), [
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
  const errorMessage = enumerate2(
    types,
    "or",
    ",",
    (list, n) =>
      ` does not match the ${
        n > 1 ? "any of the types" : "the type"
      } ${list} or any of ${n > 1 ? "their" : "its"} subtypes.`
  );

  const unmapped = filter2(types, mapped, true);

  return {
    match: selector,
    censor: (value, context) =>
      value != null ? selector(value)?.censor(value, context, false) : value,
    mapped,
    unmapped,
    validate(value, current, context, errors) {
      if (value == null) return value;
      const type = selector(value);
      if (!type) {
        errors.push({
          path: "",
          source: value,
          message: JSON.stringify(value) + errorMessage,
        });
        return VALIDATION_ERROR;
      }
      return type.validate(value, current, context, errors, false);
    },
  };
};
