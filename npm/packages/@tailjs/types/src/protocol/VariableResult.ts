import {
  AllKeys,
  Extends,
  If,
  IfNot,
  IsAny,
  MaybeArray,
  MaybePick,
  PrettifyIntersection,
  array,
  filter,
  isArray,
  isUndefined,
  map,
  deferredPromise,
  throwError,
  undefined,
} from "@tailjs/util";
import {
  Variable,
  VariableGetResult,
  VariableResultStatus,
  VariableSetResult,
  VariableSetter,
  formatKey,
} from "..";

type SuccessStatus<ChangedOnly = false> =
  | VariableResultStatus.Success
  | VariableResultStatus.Created
  | IfNot<ChangedOnly, VariableResultStatus.Unchanged>;

type VariableSuccessResult<
  R,
  Filter extends VariableSuccessResultFilter = "all",
  Return extends VariableResultType = "result"
> = R extends {
  current: infer V;
  status: SuccessStatus<Extends<"changed", Filter>>;
} // Set result
  ? Return extends "result"
    ? R
    : Return extends "variable"
    ? V
    : V extends { value: infer V }
    ? V
    : never
  : R extends {
      value?: infer V;
      status:
        | SuccessStatus<Extends<"changed", Filter>>
        | IfNot<Extends<"value", Filter>, VariableResultStatus.NotFound>;
    } // Get result
  ? Return extends "result"
    ? R
    : Return extends "variable"
    ? MaybePick<R, keyof Variable>
    : V
  : never;

export type VariableSuccessResultFilter = "value" | "changed" | "all";
export type VariableResultType = "value" | "variable" | "result";
export type VariableSuccessResults<
  Results,
  Filter extends VariableSuccessResultFilter = "all",
  Return extends VariableResultType = "result"
> = Results extends undefined
  ? undefined
  : Results extends readonly []
  ? []
  : Results extends readonly [infer Item, ...infer Rest]
  ? [
      VariableSuccessResult<Item, Filter, Return>,
      ...VariableSuccessResults<Rest, Filter, Return>
    ]
  : Results extends readonly (infer Item)[]
  ? VariableSuccessResult<Item, Filter, Return>[]
  : VariableSuccessResult<Results, Filter, Return>;

export type FilterVariableResults<
  Results,
  SuccessOnly extends boolean = false,
  Filter extends VariableSuccessResultFilter = "all"
> = If<SuccessOnly, Results, VariableSuccessResults<Results, Filter>>;

export type VariableResultPromise<
  T extends readonly any[] = readonly any[],
  Push = undefined
> = T[number] extends never
  ? never
  : PromiseLike<VariableSuccessResults<T>> &
      PrettifyIntersection<
        {
          all: PromiseLike<T>;
          changed: PromiseLike<VariableSuccessResults<T, "changed">>;
          values: PromiseLike<VariableSuccessResults<T, "all", "value">>;
          variables: PromiseLike<VariableSuccessResults<T, "all", "variable">>;
        } & (Push extends true | ((arg: any) => void)
          ? { push(): VariableResultPromise<T, false> }
          : {}) &
          (T["length"] extends 1
            ? {
                value: PromiseLike<
                  VariableSuccessResults<T, "all", "value">[0]
                >;
                result: PromiseLike<
                  Exclude<VariableSuccessResults<T>[0], undefined>
                >;
                variable: PromiseLike<
                  VariableSuccessResults<T, "all", "variable">[0]
                >;
              }
            : {})
      >;

export const toVariableResultPromise = <T extends readonly any[], Push>(
  results: () => PromiseLike<T>,
  errorHandlers?: ErrorHandlerParameter<T>,
  push?: Push &
    ((results: Exclude<VariableSuccessResult<T[number]>, undefined>[]) => void)
): VariableResultPromise<T, Push> => {
  let mapResults = (results: any): any[] => results;
  let unwrappedResults: any;
  const property = (
    map: (
      results: VariableSuccessResult<VariableGetResult | VariableSetResult>[]
    ) => any,
    errorHandler = handleResultErrors
  ) =>
    deferredPromise(
      async () =>
        (unwrappedResults = mapResults(
          errorHandler(await results(), errorHandlers)
        )) && map(unwrappedResults)
    );

  const promise: Record<AllKeys<VariableResultPromise<any, true>>, any> = {
    then: property((items) => items).then,
    all: property(
      (items) => items,
      (items) => items
    ),
    changed: property((items) => filter(items, (item) => item.status < 300)),
    variables: property((items) => map(items, getResultVariable)),
    values: property((items) =>
      map(items, (item) => getResultVariable(item)?.value)
    ),
    push: () => (
      (mapResults = (results) => (
        push?.(map(getSuccessResults(results) as any[])), results
      )),
      promise as any
    ),

    value: property((items) => getResultVariable(items[0])?.value),
    variable: property((items) => getResultVariable(items[0])),
    result: property((items) => items[0]),
  };

  return promise as any;
};

type ValidatableResult<V = {}> =
  | (V & {
      status: VariableResultStatus;
      current?: V & { version?: string };
      error?: any;
      source?: VariableSetter;
    })
  | undefined;

export const getSuccessResults = <
  R extends readonly ValidatableResult[] | undefined
>(
  results: R
): VariableSuccessResults<R> =>
  results?.map((result) => (result?.status! < 400 ? result : undefined)) as any;

export const getResultVariable = <R extends ValidatableResult>(
  result: R
): If<
  IsAny<R>,
  Variable<any, true>,
  R extends undefined
    ? never
    : R extends { current: infer V }
    ? V
    : R extends { value: any }
    ? R
    : never
> =>
  result?.status! < 400
    ? (result as VariableSetResult)?.current ?? (result as any)
    : undefined;

export const isSuccessResult = (
  result: any
): result is {
  status:
    | VariableResultStatus.Success
    | VariableResultStatus.Created
    | VariableResultStatus.Unchanged
    | VariableResultStatus.NotFound;
} => result?.status! < 400 || result?.status === 404;

type ErrorHandler<Result = any> = Result extends undefined
  ? undefined
  : undefined | ((result: Result, errorMessage: string) => void | boolean);

type ErrorHandlerParameter<Results> = Results extends readonly []
  ? readonly []
  : Results extends readonly [infer Item, ...infer Rest]
  ? readonly [ErrorHandler<Item>, ...ErrorHandlerParameter<Rest>]
  : Results extends readonly (infer Item)[]
  ? readonly ErrorHandler<Item>[]
  : ErrorHandler<Results>;

export const handleResultErrors = <
  Results extends MaybeArray<ValidatableResult, true>,
  ErrorHandlers extends ErrorHandlerParameter<Results>,
  RequireValue = false
>(
  results: Results,
  errorHandlers?: ErrorHandlers,
  requireValue?: RequireValue
): FilterVariableResults<Results, true, If<RequireValue, "value", "all">> => {
  const errors: string[] = [];
  let errorHandler: ErrorHandler;
  let errorMessage: string;
  const successResults = map(
    array(results),
    (result, i) =>
      result &&
      (result.status < 400 || (!requireValue && result.status === 404) // Not found can only occur for get requests, and those are all right.
        ? (result as any)
        : ((errorMessage = `${formatKey(
            (result as VariableSetResult).source ?? result
          )} could not be ${
            (result as VariableSetResult).status === 404
              ? "found."
              : `${
                  (result as VariableSetResult).source ||
                  result.status !== VariableResultStatus.Error
                    ? "set"
                    : "read"
                } because ${
                  result.status === VariableResultStatus.Conflict
                    ? `of a conflict. The expected version '${result.source?.version}' did not match the current version '${result.current?.version}'.`
                    : result.status === VariableResultStatus.Denied
                    ? result.error ?? "the operation was denied."
                    : result.status === VariableResultStatus.Invalid
                    ? result.error ?? "the value does not conform to the schema"
                    : result.status === VariableResultStatus.ReadOnly
                    ? "it is read only."
                    : result.status === VariableResultStatus.Error
                    ? `of an unexpected error: ${result.error}`
                    : "of an unknown reason."
                }`
          }`),
          (isUndefined((errorHandler = errorHandlers?.[i])) ||
            errorHandler(result, errorMessage) !== false) &&
            errors.push(errorMessage),
          undefined))
  );

  if (errors.length) return throwError(errors.join("\n"));
  return isArray(results) ? successResults : (successResults?.[0] as any);
};

export const requireFound = <
  T extends MaybeArray<VariableGetResult | undefined> | undefined
>(
  variable: T
): VariableSuccessResult<T, "value"> =>
  handleResultErrors(variable, undefined, true) as any;
