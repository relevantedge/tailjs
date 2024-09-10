import {
  AnyVariableResult,
  formatKey,
  isSuccessResult,
  ReadOnlyVariableGetter,
  RemoveVariableContext,
  ReplaceKey,
  ScopedKey,
  StripKey,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariableQuery,
  VariableSetResult,
  VariableSetter,
  VariableValueResult,
  VariableValueSetter,
} from "@tailjs/types";
import { Pretty, TupleParameter } from "@tailjs/util";

type MapGetResults<Keys extends readonly any[]> = {
  [Index in keyof Keys]: StripKey<Keys[Index]> extends StripKey<
    VariableGetter<infer T>
  >
    ? Pretty<ReplaceKey<VariableGetResult<T>, Keys[Index]>> extends infer Result
      ? // Pretty print
        { [P in keyof Result]: Result[P] }
      : never
    : never;
};

type MapSetResults<Keys extends readonly any[]> = {
  [Index in keyof Keys]: StripKey<Keys[Index]> extends StripKey<
    VariableSetter<infer T>
  >
    ? ReplaceKey<VariableSetResult<T>, Keys[Index]> extends infer Result
      ? // Pretty print
        { [P in keyof Result]: Result[P] }
      : never
    : never;
};

export type ScopedVariableGetters<
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> = TupleParameter<ScopedKey<Scopes, ExplicitScopes, VariableGetter>>;

export type ScopedVariableGetResults<Getters extends readonly any[]> =
  VariableResultPromise<MapGetResults<Getters>>;

export type ScopedVariableSetters<
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> = TupleParameter<ScopedKey<Scopes, ExplicitScopes, VariableGetter>>;

export type ScopedVariableSetResults<Setters extends readonly any[]> =
  VariableResultPromise<MapGetResults<Setters>>;

export interface ScopedStorage<
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> {
  get<Getters extends ScopedVariableGetters<Scopes, ExplicitScopes>>(
    getters: Getters
  ): ScopedVariableGetResults<Getters>;

  set<Setters extends ScopedVariableSetters<Scopes, ExplicitScopes>>(
    setters: Setters
  ): VariableResultPromise<MapSetResults<Setters>>;
}

export type VariableStorageKey<AddFields = {}> = RemoveVariableContext<
  VariableKey,
  AddFields
>;

export type VariableStorageGetter<AddFields = {}> = RemoveVariableContext<
  ReadOnlyVariableGetter,
  AddFields
>;
export type VariableStorageGetResult<AddFields = {}> = RemoveVariableContext<
  VariableGetResult,
  AddFields
>;

export type VariableStorageSetter<AddFields = {}> = RemoveVariableContext<
  VariableValueSetter,
  AddFields
>;
export type VariableStorageSetResult<AddFields = {}> = RemoveVariableContext<
  VariableSetResult,
  AddFields
>;

export type VariableStorageVariable<AddFields = {}> = RemoveVariableContext<
  Variable,
  AddFields
>;

export type VariableStorageQuery<AddFields = {}> = Pretty<
  Omit<VariableQuery, "scopes" | "sources" | "classification" | "purposes"> &
    AddFields
>;

export interface ReadOnlyVariableStorage<AddFields = {}> {
  /** Gets or initializes the variables with the specified keys. */
  get(
    keys: VariableStorageGetter<AddFields>[]
  ): Promise<VariableStorageGetResult<AddFields>[]>;

  /** Gets the variables for the specified entities. */
  query(
    queries: VariableStorageQuery<AddFields>[]
  ): Promise<VariableStorageVariable<AddFields>[]>;
}

export interface VariableStorage<AddFields = {}>
  extends ReadOnlyVariableStorage {
  /** Sets the variables with the specified keys and values. */
  set(
    values: VariableStorageSetter<AddFields>[]
  ): Promise<VariableStorageSetResult<AddFields>[]>;

  /** Purges all the keys matching the specified queries.  */
  purge(queries: VariableStorageQuery<AddFields>[]): Promise<void>;
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
