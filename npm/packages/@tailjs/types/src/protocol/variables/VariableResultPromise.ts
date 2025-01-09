import {
  ArrayOrSelf,
  deferredPromise,
  Falsish,
  IfNever,
  isArray,
  MaybePromiseLike,
  throwError,
} from "@tailjs/util";
import {
  formatVariableKey,
  isSuccessResult,
  KnownVariableMap,
  MatchScopes,
  RemoveScopeRestrictions,
  RestrictScopes,
  VariableGetResult,
  VariableGetter,
  VariableInitializer,
  VariableInitializerCallback,
  VariableKey,
  VariablePatch,
  VariablePatchFunction,
  VariableResult,
  VariableResultStatus,
  VariableSetResult,
  VariableSetter,
  VariableSuccessStatus,
  VariableValueErrorResult,
  VariableValueSetter,
} from "../..";

type NotString<S> = string extends S ? never : S;
type Lookup<T, Source, Key> = unknown extends Key
  ? never
  : T[keyof T & NotString<Source[Key & keyof Source]>];

export type KnownTypeFor<
  Operation,
  KnownTypes extends KnownVariableMap,
  Default = unknown
> = IfNever<
  Lookup<Lookup<KnownTypes, Operation, "scope">, Operation, "key">,
  Default
> & {};

/**
 * If the callback returns `true` the variable will get polled, that is, the callback will be called again if the variable changes.
 * If the variable is deleted, the callback will be called with a NotFound get result.
 *
 * This currently only works client-side.
 */
export type VariableGetterCallback<
  KeyType = VariableKey,
  T extends {} = any
> = (
  result: MatchScopes<
    VariableResultPromiseResult<"get", VariableGetResult<T>>,
    KeyType
  >
) => MaybePromiseLike<boolean | undefined | void>;

export type VariableSetterCallback<
  KeyType = VariableKey,
  T extends {} = any
> = (
  result: MatchScopes<
    VariableResultPromiseResult<"set", VariableSetResult<T>>,
    KeyType
  >
) => any;

/**
 * Validate types for callbacks.
 */
export type WithCallbacks<
  OperationType extends string,
  Operation,
  KnownVariables extends KnownVariableMap
> = Operation extends readonly any[]
  ? {
      [P in keyof Operation]: WithCallbacks<
        OperationType,
        Operation[P],
        KnownVariables
      >;
    }
  : Operation extends { scope: any }
  ? {
      [P in keyof Operation]: P extends "patch"
        ? Operation[P] extends VariablePatchFunction<
            infer Current,
            infer Result
          >
          ? VariablePatchFunction<
              KnownTypeFor<
                Operation,
                KnownVariables,
                unknown extends Current ? Result : Current
              >
            >
          : never
        : P extends "value"
        ? KnownTypeFor<Operation, KnownVariables, any> | null | undefined
        : P extends "init"
        ?
            | undefined
            | VariableInitializerCallback<
                KnownTypeFor<Operation, KnownVariables, any>
              >
        : P extends "callback"
        ?
            | undefined
            | (OperationType extends "set"
                ? VariableSetterCallback<
                    Operation,
                    KnownTypeFor<Operation, KnownVariables, any>
                  >
                : VariableGetterCallback<
                    Operation,
                    KnownTypeFor<Operation, KnownVariables, any>
                  >)
        : Operation[P];
    }
  : Operation;

type TupleOrSelf<T> = T | readonly T[] | readonly [T];

export type VariableOperationParameter<T> = TupleOrSelf<
  Falsish | (T & { callback?: any })
>;

type VariableOperationResultItem<OperationType extends "get" | "set"> =
  OperationType extends "get" ? VariableGetResult : VariableSetResult;

export type VariableOperationResult<
  OperationType extends "get" | "set",
  Operations,
  ScopeTemplate extends { scope: string; entityId?: string },
  KnownTypes extends KnownVariableMap = never
> = VariableResultPromise<OperationType, Operations, ScopeTemplate, KnownTypes>;

// type GenericVariableValue =
//   | {
//       [property: string | number]: GenericVariableValue | null | undefined;
//     }
//   | (GenericVariableValue | null)[]
//   | string
//   | number
//   | boolean;
//type GenericVariableValue = any; // Default value for unknown variable types.
type GenericVariableValue = unknown;

type ReplaceKey<Target, Source> = Target extends infer Target
  ? {
      [P in keyof Target]: P extends keyof VariableKey
        ? Source[P & keyof Source]
        : Target[P];
    } extends infer T
    ? { [P in keyof T]: T[P] }
    : never
  : never;

type MapVariableResult<
  Operation,
  Type extends "success" | "all" | "value" = "success",
  Require extends boolean = false,
  KnownTypes extends KnownVariableMap = never
> = Operation extends Falsish
  ? undefined
  : Operation extends readonly any[]
  ? {
      -readonly [P in keyof Operation]: MapVariableResult<
        Operation[P],
        Type,
        Require,
        KnownTypes
      >;
    }
  : (
      Operation extends
        | Pick<VariableValueSetter<infer Result>, "value">
        | Pick<VariablePatch<infer Current, infer Result>, "patch">
        ? [
            "set",
            ReplaceKey<
              VariableSetResult<
                unknown extends Current
                  ? unknown extends Result
                    ? KnownTypeFor<Operation, KnownTypes, GenericVariableValue>
                    : Result
                  : Current
              >,
              Operation
            > & {
              // NotModified is only for underlying VariableStorages behind façades that returns result promises.
              status: Exclude<
                VariableResultStatus,
                Result extends null ? never : VariableResultStatus.NotFound
              >;
            }
          ]
        : [Operation] extends [never]
        ? never
        : [
            "get",
            ReplaceKey<
              VariableGetResult<
                {} & (Operation extends Pick<
                  VariableInitializer<infer Result>,
                  "init"
                >
                  ? unknown extends Result
                    ? KnownTypeFor<Operation, KnownTypes, GenericVariableValue>
                    : Result
                  : KnownTypeFor<Operation, KnownTypes, GenericVariableValue>)
              > & {
                status: Exclude<
                  VariableResultStatus,
                  | ([Operation] extends [
                      { ifModifiedSince: number } | { ifNoneMatch: string }
                    ]
                      ? never
                      : VariableResultStatus.NotModified)
                  | ([Operation] extends [{ init: any }]
                      ? never
                      :
                          | VariableResultStatus.Created
                          | VariableValueErrorResult["status"])
                >;
              },
              Operation
            >
          ]
    ) extends [infer OperationType, infer Result]
  ? (
      Type extends "all"
        ? Result
        : Result extends { status: VariableResultStatus.NotFound }
        ? Require extends true
          ? never
          : OperationType extends "get"
          ? undefined
          : never // Not found is an error result for set operations.
        : Result extends { status: VariableResultStatus.NotModified }
        ? Type extends "value"
          ? undefined
          : VariableResultPromiseResult<OperationType, Result>
        : Result extends { status: VariableSuccessStatus; value: any }
        ? Type extends "value"
          ? Result["value"]
          : Result
        : never
    ) extends infer Result
    ? Type extends "value"
      ? Result
      : Result extends undefined
      ? undefined
      : Result extends { [x: string]: never }
      ? never
      : VariableResultPromiseResult<OperationType, Result>
    : never
  : never;

export type VariableResultPromise<
  OperationType extends "get" | "set",
  Operations,
  ScopeTemplate extends { scope: string; entityId?: string },
  KnownTypes extends KnownVariableMap = never
> = unknown[] extends Operations
  ? VariableResultPromise<
      OperationType,
      VariableOperationResultItem<OperationType>[],
      ScopeTemplate
    >
  : unknown extends Operations
  ? VariableResultPromise<
      OperationType,
      VariableOperationResultItem<OperationType>,
      ScopeTemplate
    >
  : Promise<
      MatchScopes<
        MapVariableResult<Operations, "success", false, KnownTypes>,
        ScopeTemplate
      >
    > & {
      /** Return all variable results with error status codes instead of throwing errors. */
      all(): Promise<
        MatchScopes<
          MapVariableResult<Operations, "all", false, KnownTypes>,
          ScopeTemplate
        >
      >;
      require(): Promise<
        MatchScopes<
          MapVariableResult<Operations, "success", true, KnownTypes>,
          ScopeTemplate
        >
      >;
    } & (Operations extends readonly any[]
        ? {
            values<Require extends boolean = false>(
              require?: Require
            ): Promise<
              MapVariableResult<Operations, "value", Require, KnownTypes>
            >;
          }
        : {
            value<Require extends boolean = false>(
              require?: Require
            ): Promise<
              MapVariableResult<Operations, "value", Require, KnownTypes>
            >;
          });

const formatVariableResult = (
  result: RestrictScopes<VariableResult, string, any>
) => {
  const key = formatVariableKey(result);
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
    MapVariableResult<Operations, "all">,
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
  operationType: OperationType,
  operations: Operations | ArrayOrSelf<Falsish | { scope: Scope }>,
  handler: (
    operations: RemoveScopeRestrictions<
      OperationType extends "get" ? VariableGetter : VariableSetter
    >[]
  ) => Promise<
    Map<
      RemoveScopeRestrictions<VariableKey, true>,
      RemoveScopeRestrictions<VariableResult, true>
    >
  >
): VariableResultPromise<OperationType, Operations, any> => {
  const mapResults = async (
    type:
      | 0 // any
      | 1 // throw on errors
      | 2, // values (also throw on errors)
    require: boolean
  ) => {
    const ops = isArray(operations) ? (operations as any) : [operations];
    // The raw results from the map function including error results.

    const mappedResults = await handler(ops.filter((op: any) => op));
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
      const result: VariableResult & { success: boolean } =
        (mappedResults.get(op) as any) ??
        throwError(`No result for ${formatVariableKey(op)}.`);

      op.source = result;
      if (op.callback) {
        callbacks.push(op.callback(result));
      }
      result.success =
        !type ||
        isSuccessResult(
          result,
          // Not found is an error result for set operations.
          require || operationType === "set"
        );
      if (result.success) {
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
    deferredPromise(() => mapResults(1, false)),
    {
      all: () => mapResults(0, false),
      require: () => mapResults(1, true),
      value: (require = false) => mapResults(2, require),
      values: (require = false) => mapResults(2, require),
    }
  );

  return resultPromise as any;
};

export type VariableResultPromiseResult<OperationType, Result> = Result &
  (
    | {
        status:
          | VariableResultStatus.Success
          | VariableResultStatus.Created
          | (OperationType extends "get"
              ? VariableResultStatus.NotFound
              : never);
        success: true;
      }
    | {
        status: Exclude<
          VariableResultStatus,
          | VariableResultStatus.Success
          | VariableResultStatus.Created
          | (OperationType extends "get"
              ? VariableResultStatus.NotFound
              : never)
        >;
        success: false;
      }
  );
