import {
  AllKeys,
  ArrayOrSelf,
  deferredPromise,
  Falsish,
  IfNever,
  isArray,
  MaybePromiseLike,
} from "@tailjs/util";
import {
  formatVariableKey,
  isSuccessResult,
  isVariableResult,
  KnownVariableMap,
  MatchScopes,
  RemoveScopeRestrictions,
  RestrictScopes,
  Variable,
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

export type VariableCallback<Result = VariableResult, Return = any> = (
  result: Result
) => MaybePromiseLike<Return>;

/**
 * If the callback returns `true` the variable will get polled, that is, the callback will be called again if the variable changes.
 * If the variable is deleted, the callback will be called with a NotFound get result.
 *
 * Polling currently only works client-side.
 */
export type VariableGetterCallback<
  KeyType = VariableKey,
  T extends {} = any
> = VariableCallback<
  MatchScopes<
    VariableResultPromiseResult<"get", VariableGetResult<T>>,
    KeyType
  >,
  boolean | undefined | void
>;

/**
 * If the callback returns `true` the variable will get polled, that is, the callback will be called again if the variable changes.
 * If the variable is deleted or not found, it will be called with `undefined`.
 *
 * Polling currently only works client-side.
 */
export type VariablePollCallback<T extends {} = any> = (
  result: T | undefined,
  fromSourceOperation: boolean,
  previous: T | undefined
) => MaybePromiseLike<boolean | undefined | void>;

export type VariableSetterCallback<
  KeyType = VariableKey,
  T extends {} = any
> = VariableCallback<
  MatchScopes<VariableResultPromiseResult<"set", VariableSetResult<T>>, KeyType>
>;

type ValidOperationKeys =
  | AllKeys<VariableGetter | VariableSetter | Variable>
  // To suspend client-side polling callbacks
  | "passive";

/**
 * Validate types for callbacks.
 */
export type WithCallbacks<
  OperationType extends "get" | "set",
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
        : [P, OperationType] extends ["poll", "get"]
        ?
            | undefined
            | VariablePollCallback<KnownTypeFor<Operation, KnownVariables, any>>
        : P extends ValidOperationKeys
        ? Operation[P]
        : never;
    }
  : Operation;

type TupleOrSelf<T> = T | readonly T[] | readonly [T];

export type VariableOperationParameter<
  OperationType extends "get" | "set",
  Operation
> = TupleOrSelf<
  | Falsish
  | (Operation &
      (OperationType extends "get"
        ? {
            callback?: VariableGetterCallback<Operation>;
            poll?: VariablePollCallback;
          }
        : { callback?: VariableSetterCallback<Operation> }))
>;

type VariableOperationResultItem<OperationType extends "get" | "set"> =
  OperationType extends "get" ? VariableGetResult : VariableSetResult;

export type VariableOperationResult<
  OperationType extends "get" | "set",
  Operations,
  ScopeTemplate extends { scope: string; entityId?: string },
  KnownTypes extends KnownVariableMap = never
> = VariableResultPromise<OperationType, Operations, ScopeTemplate, KnownTypes>;

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
  KnownTypes extends KnownVariableMap = never,
  DefaultType extends {} = {}
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
                DefaultType &
                  (Operation extends Pick<
                    VariableInitializer<infer Result>,
                    "init"
                  >
                    ? unknown extends Result
                      ? KnownTypeFor<
                          Operation,
                          KnownTypes,
                          GenericVariableValue
                        >
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
        : Result extends { status: VariableSuccessStatus; value?: any }
        ? OperationType extends "get"
          ? Type extends "value"
            ? Result["value"]
            : Result
          : Operation extends { value?: null | undefined }
          ? Type extends "value"
            ? undefined
            : Result & { value?: undefined }
          : Type extends "value"
          ? Result["value"] & Operation[keyof Operation & "value"]
          : Result & Pick<Operation, keyof Operation & "value">
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
      all<T extends {} = {}>(): Promise<
        MatchScopes<
          MapVariableResult<Operations, "all", false, KnownTypes, T>,
          ScopeTemplate
        >
      >;
      require<T extends {} = {}>(): Promise<
        MatchScopes<
          MapVariableResult<Operations, "success", true, KnownTypes, T>,
          ScopeTemplate
        >
      >;
      as<T extends {}>(): Promise<
        MatchScopes<
          MapVariableResult<Operations, "success", false, KnownTypes, T>,
          ScopeTemplate
        >
      >;
    } & (Operations extends readonly any[]
        ? {
            values<T extends {} = {}>(
              require: true
            ): Promise<
              MapVariableResult<Operations, "value", true, KnownTypes, T>
            >;
            values<T extends {} = {}>(
              require?: boolean
            ): Promise<
              MapVariableResult<Operations, "value", false, KnownTypes, T>
            >;
          }
        : {
            value<T extends {} = {}>(
              require: true
            ): Promise<
              MapVariableResult<Operations, "value", true, KnownTypes, T>
            >;
            value<T extends {} = {}>(
              require?: boolean
            ): Promise<
              MapVariableResult<Operations, "value", false, KnownTypes, T>
            >;
          });

export const formatVariableResult = (
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

const hasCallback = (op: any): op is { callback: VariableCallback } =>
  !!op["callback"];

const hasPollCallback = (op: any): op is { poll: VariablePollCallback } =>
  !!op["poll"];

const sourceOperation = Symbol();

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
  >,
  {
    poll,
    logCallbackError,
  }: {
    poll?: (
      source: OperationType extends "get" ? VariableGetter : VariableSetter,
      callback: OperationType extends "get"
        ? VariableGetterCallback
        : VariableSetterCallback
    ) => void;
    logCallbackError?: (
      message: string,
      operation: OperationType extends "get" ? VariableGetter : VariableSetter,
      error: any
    ) => void;
  } = {}
): VariableResultPromise<OperationType, Operations, any> => {
  const ops = isArray(operations) ? (operations as any) : [operations];
  const callbackErrors: string[] = [];

  const handlerResultPromise = (async () => {
    const results = await handler(ops.filter((op: any) => op));
    const callbacks: [
      op: any,
      initialResult: any,
      callback: (result: VariableResult) => any
    ][] = [];

    for (const op of ops) {
      if (!op) {
        continue;
      }

      const result: VariableResult = results.get(op) as any;

      if (result == null) {
        // This error will be caught, if the result promise is awaited.
        continue;
      }

      result[sourceOperation] = op;

      if (hasCallback(op)) {
        callbacks.push([op, result, (result) => op.callback(result) === true]);
      }
      if (hasPollCallback(op)) {
        let previous: any;
        // This is only defined for get operations.
        callbacks.push([
          op,
          result,
          (result) => {
            if (!isVariableResult(result, false)) {
              return true;
            }
            const poll = isVariableResult(result, false)
              ? op.poll(result.value, result[sourceOperation] === op, previous)
              : true;

            previous = result.value;
            return poll;
          },
        ]);
      }
    }
    for (const [op, initialResult, callback] of callbacks) {
      try {
        const pollingCallback =
          operationType === "get"
            ? async (result: any) =>
                (await callback(result)) === true && poll?.(op, pollingCallback)
            : callback;
        await pollingCallback(initialResult);
      } catch (error) {
        const message = `${operationType} callback for ${formatVariableKey(
          op
        )} failed: ${error}.`;
        if (logCallbackError) {
          logCallbackError(message, op, error);
        } else {
          callbackErrors.push(message);
        }
      }
    }

    return results;
  })();

  const mapResults = async (
    type:
      | 0 // any
      | 1 // throw on errors
      | 2, // values (also throw on errors)
    require: boolean
  ) => {
    // The raw results from the map function including error results.
    const handlerResults = await handlerResultPromise;

    // The results we will return if there are no errors;
    const results: any[] = [];
    const errors: string[] = [];

    for (const op of ops) {
      if (!op) {
        // Falsish to undefined.
        results.push(undefined);
        continue;
      }
      const result: VariableResult = handlerResults.get(op) as any;

      if (result == null) {
        errors.push(`No result for ${formatVariableKey(op)}.`);
        continue;
      }

      if (
        !type ||
        isSuccessResult(
          result,
          // 404 is an error result for set operations, but not for get.
          require || operationType === "set"
        )
      ) {
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

    errors.push(...callbackErrors);
    if (errors.length) {
      if (errors.length > 10) {
        errors.push(`\n(and ${errors.splice(10).length} more...)`);
      }
      throw new VariableStorageError(results, errors.join("\n"));
    }

    return ops === operations ? results : results[0]; // Single value if single value.
  };

  const resultPromise = Object.assign(
    deferredPromise(() => mapResults(1, false)),
    {
      as: () => mapResults(1, false),
      all: () => mapResults(0, false),
      require: () => mapResults(1, true),
      value: (require = false) => mapResults(2, require),
      values: (require = false) => mapResults(2, require),
    }
  );

  return resultPromise as any;
};

export type VariableResultPromiseResult<OperationType, Result> = Result;
