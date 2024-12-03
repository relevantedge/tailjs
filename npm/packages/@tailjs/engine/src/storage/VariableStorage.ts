import {
  formatKey,
  isSuccessResult,
  MapVariableResult,
  ReadOnlyVariableGetter,
  ScopedKey,
  VariableGetResult,
  VariableGetter,
  VariableGetterCallback,
  VariableKey,
  VariablePatchFunction,
  VariableQuery,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResult,
  VariableResultStatus,
  VariableSetResult,
  VariableSetter,
  VariableSetterCallback,
  VariableValueSetter,
} from "@tailjs/types";
import {
  deferredPromise,
  DenyExtraProperties,
  Falsish,
  FalsishToUndefined,
  Pretty,
  TupleParameter,
} from "@tailjs/util";
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
    source?: string | null;
    scope: string;
  }
>;

export interface ReadOnlyVariableStorage {
  /** Gets or initializes the variables with the specified keys. */
  get(keys: ReadOnlyVariableGetter[]): Promise<VariableGetResult[]>;

  /** Gets the variables for the specified entities. */
  query(
    queries: VariableStorageQuery[],
    options?: VariableQueryOptions
  ): Promise<VariableQueryResult>;

  initialize?(environment: TrackerEnvironment): Promise<void>;
}

export interface VariableStorage extends ReadOnlyVariableStorage {
  /** Sets the variables with the specified keys and values. */
  set(values: VariableValueSetter[]): Promise<VariableSetResult[]>;

  /** Purges all the keys matching the specified queries. Returns the number of deleted variables.  */
  purge(queries: VariableStorageQuery[]): Promise<number>;
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
    ? PromiseLike<MapVariableResult<Operations>> & {
        /** Return variables with error status codes instead of throwing errors. */
        raw(): Promise<MapVariableResult<Operations, "raw">>;
      } & (Operations extends readonly any[]
          ? { values(): Promise<MapVariableResult<Operations, "value">> }
          : { value(): Promise<MapVariableResult<Operations, "value">> })
    : never;

const formatVariableResult = (result: VariableResult) => {
  const key = formatKey(result);
  const error = (result as any).error;
  return result.status < 400
    ? `${key} succeeded with status ${result.status} - ${
        VariableResultStatus[result.status]
      }.`
    : `${key} failed with status ${result.status} - ${
        VariableResultStatus[result.status]
      }${error ? ` (${error})` : ""}.`;
};

export class VariableStorageError<
  Operations extends undefined | { [Symbol.iterator]?: never } | readonly any[]
> extends Error {
  public readonly succeeded: MapVariableResult<Operations, "success">;

  public readonly failed: Exclude<
    MapVariableResult<Operations, "raw">,
    MapVariableResult<Operations, "success">
  >;

  constructor(operations: Operations, message: string) {
    super(message ?? "One or more operations failed.");
    this.succeeded =
      ((operations as VariableResult[])?.filter((operation) =>
        isSuccessResult(operation, false)
      ) as any) ?? [];
    this.failed =
      ((operations as VariableResult[])?.filter(
        (operation) => !isSuccessResult(operation, false)
      ) as any) ?? [];
  }
}

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
      if (!type || isSuccessResult(result, false)) {
        results.push(
          type && result.status === VariableResultStatus.NotFound
            ? null
            : type > 1
            ? result["value"]
            : result
        );
      } else {
        errors.push(formatVariableResult(result));
      }
    }
    if (errors.length) {
      if (errors.length > 10) {
        errors.push(`\n(and ${errors.splice(10).length} more...)`);
      }
      throw new VariableStorageError(ops, errors.join("\n"));
    }

    for (const callback of callbacks) {
      await callback();
    }

    return ops === operations ? results : results[0]; // Single value if single value.
  };

  const resultPromise = Object.assign(
    deferredPromise(() => mapResults(1)),
    {
      raw: () => mapResults(0),
      value: () => mapResults(2),
      values: () => mapResults(2),
    }
  );

  return resultPromise as any;
};
