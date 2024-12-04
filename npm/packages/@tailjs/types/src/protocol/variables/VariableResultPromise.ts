import {
  ArrayOrSelf,
  deferredPromise,
  DenyExtraProperties,
  Falsish,
  FalsishToUndefined,
  isArray,
  ItemOrSelf,
  MaybeArray,
  TupleParameter,
} from "@tailjs/util";
import {
  formatKey,
  isSuccessResult,
  MapVariableResult,
  MatchKey,
  ScopedKey,
  VariableGetResult,
  VariableGetter,
  VariableGetterCallback,
  VariableKey,
  VariablePatchFunction,
  VariableResult,
  VariableResultStatus,
  VariableScope,
  VariableSetResult,
  VariableSetter,
  VariableSetterCallback,
} from "../..";

export type ScopedVariableGetters<
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> = TupleParameter<ScopedKey<VariableGetter, Scopes, ExplicitScopes>>;

export type ScopedVariableSetters<
  Scopes extends string,
  ExplicitScopes extends string = Scopes
> = TupleParameter<ScopedKey<VariableSetter, Scopes, ExplicitScopes>>;

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

type TupleOrSelf<T> = T | readonly T[] | readonly [T];

export type VariableOperationParameter<
  T extends VariableKey,
  Scopes extends string,
  ExplicitScopes extends string = "global"
> = TupleOrSelf<Falsish | ScopedKey<T, Scopes, ExplicitScopes>>;

type VariableOperationResultItem<
  OperationType extends "get" | "set",
  Scopes extends string,
  ExplicitScopes extends string
> = ScopedKey<
  OperationType extends "get" ? VariableGetResult : VariableSetResult,
  Scopes,
  ExplicitScopes
>;

export type VariableOperationResult<
  OperationType extends "get" | "set",
  Operations,
  Scopes extends string,
  ExplicitScopes extends string = "global"
> = VariableResultPromise<OperationType, Operations, Scopes, ExplicitScopes>;

export type VariableResultPromise<
  OperationType extends "get" | "set",
  Operations,
  Scopes extends string = string,
  ExplicitScopes extends string = any
> = unknown[] extends Operations
  ? VariableResultPromise<
      OperationType,
      VariableOperationResultItem<OperationType, Scopes, ExplicitScopes>[],
      Scopes,
      ExplicitScopes
    >
  : unknown extends Operations
  ? VariableResultPromise<
      OperationType,
      VariableOperationResultItem<OperationType, Scopes, ExplicitScopes>,
      Scopes,
      ExplicitScopes
    >
  : Promise<
      MapVariableResult<Operations, "success", Scopes, ExplicitScopes>
    > & {
      /** Return variables with error status codes instead of throwing errors. */
      raw(): Promise<
        MapVariableResult<Operations, "raw", Scopes, ExplicitScopes>
      >;
    } & (Operations extends readonly any[]
        ? {
            values(): Promise<
              MapVariableResult<Operations, "value", Scopes, ExplicitScopes>
            >;
          }
        : {
            value(): Promise<
              MapVariableResult<Operations, "value", Scopes, ExplicitScopes>
            >;
          });

const formatVariableResult = (result: ScopedKey<VariableResult>) => {
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
  OperationType extends "get" | "set",
  Operations,
  Scope
>(
  type: OperationType,
  operations: Operations | ArrayOrSelf<Falsish | { scope: Scope }>,
  handler: (
    operations: ((OperationType extends "get"
      ? VariableGetter
      : VariableSetter) & {
      scope: Scope;
    } extends infer T
      ? { [P in keyof T]: T[P] }
      : never)[]
  ) => Promise<ScopedKey<VariableResult>[]>
): VariableResultPromise<OperationType, Operations> => {
  const mapResults = async (
    type:
      | 0 // any
      | 1 // throw on errors
      | 2 // values (also throw on errors)
  ) => {
    const ops = isArray(operations) ? (operations as any) : [operations];
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
            ? undefined
            : type > 1
            ? result["value"] ?? undefined
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
