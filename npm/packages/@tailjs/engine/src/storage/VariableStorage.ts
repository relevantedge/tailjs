import {
  AnyVariableResult,
  formatKey,
  isSuccessResult,
  ReadOnlyVariableGetter,
  ScopedKey,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariablePatchFunction,
  VariableQuery,
  VariableSetResult,
  VariableSetter,
  VariableValueResult,
  VariableValueSetter,
} from "@tailjs/types";
import { DenyExtraProperties, Pretty, TupleParameter } from "@tailjs/util";
import { TrackerEnvironment } from "../TrackerEnvironment";

export type ScopedVariableGetters<
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> = TupleParameter<ScopedKey<VariableGetter, Scopes, ExplicitScopes>>;

export type ScopedVariableSetters<
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> = TupleParameter<ScopedKey<VariableSetter, Scopes, ExplicitScopes>>;

export type VariableStorageQuery = Pretty<
  Omit<VariableQuery, "classification" | "purposes">
>;

export interface ReadOnlyVariableStorage {
  /** Gets or initializes the variables with the specified keys. */
  get(keys: ReadOnlyVariableGetter[]): Promise<VariableGetResult[]>;

  /** Gets the variables for the specified entities. */
  query(queries: VariableStorageQuery[]): Promise<Variable[]>;

  initialize?(environment: TrackerEnvironment): Promise<void>;
}

export interface VariableStorage extends ReadOnlyVariableStorage {
  /** Sets the variables with the specified keys and values. */
  set(values: VariableValueSetter[]): Promise<VariableSetResult[]>;

  /** Purges all the keys matching the specified queries.  */
  purge(queries: VariableStorageQuery[]): Promise<void>;
}

export const isWritableStorage = (storage: any): storage is VariableStorage =>
  "set" in storage;

type SuccessOnly<Result, Toggle> = Toggle extends true
  ? {
      [Index in keyof Result]: Toggle extends true
        ? Result[Index] extends infer Result
          ? Result extends { value: any }
            ? Result
            : never
          : never
        : Result[Index];
    }
  : Result;

type PickValue<Result extends readonly any[]> = {
  [P in keyof Result]: Result[P] extends infer Result
    ? Result extends { value: infer Value }
      ? Value
      : never
    : never;
};

/**
 * Typescript is not smart enough to suggest the properties for the return type in patch functions
 * in a tuple of variable setters unless this "little" trick is applied:
 * 1. Disallow the item from the original tuple if it has a patch function.
 * 2. Add an intersection with a patch function with the same type for the current value and disallow any additional
 *    properties from the result that are not present in the current value.
 */
export type WithPatchIntellisense<Setters extends readonly any[]> =
  | (Setters & {
      [P in keyof Setters]: Setters[P] extends { patch(...args: any): any }
        ? never
        : Setters[P];
    })
  | {
      [P in keyof Setters]: Setters[P] extends {
        patch: VariablePatchFunction<infer Current, infer Result>;
      }
        ? unknown extends Current
          ? Setters[P]
          : Omit<Setters[P], "patch"> & {
              patch: VariablePatchFunction<
                any,
                DenyExtraProperties<Result, Current>
              >;
            }
        : Setters[P];
    };

export interface VariableResultPromise<K extends readonly any[]>
  extends Promise<K> {
  require(): Promise<SuccessOnly<K, true>>;
  values(): Promise<PickValue<K>>;
  value(): Promise<PickValue<K>[0]>;
  first<Require extends boolean = true>(
    require?: Require
  ): Promise<SuccessOnly<K, Require>[0]>;
}

const formatVariableResult = (
  result: VariableGetResult | VariableSetResult
) => {
  const key = formatKey(result);
  const error = (result as any).error;
  return result.status < 400
    ? `${key} succeeded with status ${result.status}.`
    : `${key} failed with status ${result.status}${
        error ? ` (${error})` : ""
      }.`;
};

export const toVariableResultPromise = <K extends AnyVariableResult[]>(
  variables: Promise<K> | K
): VariableResultPromise<K> => {
  const getResults = async <Throw extends boolean>(
    require: Throw
  ): Promise<
    Throw extends true ? VariableValueResult[] : AnyVariableResult[]
  > => {
    const results = await variables;
    const success: any[] = [];
    const errors: string[] = [];
    for (const result of results) {
      if (isSuccessResult(result)) {
        success.push(result);
      } else {
        errors.push(formatVariableResult(result));
      }
    }
    if (require) {
      throw new Error(errors.join("\n"));
    }
    return results as any;
  };
  const resultPromise = Object.assign(
    (variables as any)?.then ? variables : Promise.resolve(variables),
    {
      require: () => getResults(true),
      values: async () =>
        (await getResults(true)).map((result) => result.value),
      first: async (require = true) => (await getResults(require))[0],
      value: async () => (await resultPromise.values())[0],
    }
  );

  return resultPromise as any;
};

export const SCHEMA_TYPE_PROPERTY = "@type";
export interface SchemaTypeInfo {
  type: string;
  version?: string;
}
export interface TypedSchemaData {
  "@type"?: SchemaTypeInfo;
}
