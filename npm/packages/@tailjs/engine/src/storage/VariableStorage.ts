import {
  formatKey,
  isNotFoundResult,
  isSuccessResult,
  MapVariableResult,
  ReadOnlyVariableGetter,
  ScopedKey,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableGetterCallback,
  VariableKey,
  VariablePatchFunction,
  VariableQuery,
  VariableResult,
  VariableSetResult,
  VariableSetter,
  VariableSetterCallback,
  VariableValueSetter,
} from "@tailjs/types";
import {
  DenyExtraProperties,
  Falsish,
  FalsishToUndefined,
  Pretty,
  TupleParameter,
} from "@tailjs/util";
import { error } from "console";
import { TrackerEnvironment } from "..";

export type ScopedVariableGetters<
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> = TupleParameter<ScopedKey<VariableGetter, Scopes, ExplicitScopes>>;

export type ScopedVariableSetters<
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> = TupleParameter<ScopedKey<VariableSetter, Scopes, ExplicitScopes>>;

export type VariableStorageQuery = Pretty<
  Omit<VariableQuery, "classification" | "purposes" | "scopes" | "sources"> & {
    source?: string;
    scope: string;
  }
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

/**
 * Without this little trick, TypeScript is not smart enough to suggest the properties for the return type in patch functions
 * even if the parameter type is specified, that is, `patch: (current: {x: string})=>(no intellisense here)`
 */
export type WithCallbackIntellisense<Operation> =
  Operation extends readonly any[]
    ? {
        [P in keyof Operation]: WithCallbackIntellisense<Operation[P]>;
      }
    : Operation extends {
        patch: VariablePatchFunction<infer Current, infer Result>;
      }
    ? Omit<
        unknown extends Current
          ? Operation
          : Omit<Operation, "patch"> & {
              patch: VariablePatchFunction<
                any,
                DenyExtraProperties<Result, Current>
              >;
            },
        "callback"
      > & { callback?: VariableSetterCallback<Result> }
    : Operation extends Falsish
    ? Operation
    : Omit<Operation, "callback"> & {
        callback?: Operation extends { value: infer T }
          ? VariableSetterCallback<T>
          : VariableGetterCallback<
              Operation extends { init: () => infer T } ? T : any
            >;
      };

type TupleOrSelf<T> =
  | (T & { [Symbol.iterator]?: never })
  | readonly T[]
  | readonly [T];

export type VariableOperationParameter<
  T extends VariableKey,
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> = undefined | TupleOrSelf<Falsish | ScopedKey<T, Scopes, ExplicitScopes>>;

export type VariableResultPromise<Operations> =
  FalsishToUndefined<Operations> extends infer Operations
    ? Promise<MapVariableResult<Operations>> & {
        throw(): Promise<MapVariableResult<Operations, "throw">>;
        value(): Promise<MapVariableResult<Operations, "value">>;
      }
    : never;

const formatVariableResult = (result: VariableResult) => {
  const key = formatKey(result);
  const error = (result as any).error;
  return result.status < 400
    ? `${key} succeeded with status ${result.status}.`
    : `${key} failed with status ${result.status}${
        error ? ` (${error})` : ""
      }.`;
};

export const toVariableResultPromise = <
  Operations extends undefined | { [Symbol.iterator]?: never } | readonly any[]
>(
  operations: Operations,
  handler: (operations: Operations[]) => Promise<VariableResult[]>
): VariableResultPromise<Operations> => {
  const mapResults = async (
    type:
      | 0 // any
      | 1 // throw on errors
      | 2 // values (also throw on errors)
  ) => {
    const ops = Array.isArray(operations) ? operations : [operations];
    // The raw results from the map function including error results.
    const resultSource = await handler(ops.filter((op) => op));
    // The results we will return if there are no errors;
    const results: any[] = [];
    const errors: string[] = [];
    const callbacks: (() => any)[] = [];
    let i = 0;
    for (const op of ops) {
      if (!op) {
        // Falsish to undefined.
        results.push(undefined);
        continue;
      }
      const result = resultSource[i++];
      if (op.callback) {
        callbacks.push(op.callback(result));
      }
      if (!type || isSuccessResult(result) || isNotFoundResult(result)) {
        results.push(type > 1 ? result["value"] : result);
      } else {
        errors.push(formatVariableResult(result));
      }
    }
    if (error.length) {
      throw new Error(errors.join("\n"));
    }

    for (const callback of callbacks) {
      await callback();
    }

    return ops === operations ? ops : ops[0]; // Single value if single value.
  };

  const resultPromise = Object.assign(mapResults(0), {
    throw: () => mapResults(1),
    value: () => mapResults(2),
  });

  return resultPromise as any;
};
