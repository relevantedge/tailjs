import {
  If,
  IfNot,
  IsAny,
  MaybeArray,
  OmitPartial,
  PrettifyIntersection,
  apply,
  applyAsync,
  isArray,
  thenMethod,
  thenable,
  throwError,
  toArray,
} from "@tailjs/util";
import {
  Variable,
  VariableGetResult,
  VariableGetSuccessResult,
  VariableResultStatus,
  VariableSetResult,
  VariableSetSuccessResult,
  VariableSetter,
  formatKey,
} from "..";

type SuccessStatus<ChangedOnly = false> =
  | VariableResultStatus.Success
  | VariableResultStatus.Created
  | IfNot<ChangedOnly, VariableResultStatus.Unchanged>;

type VariableSuccessResult<
  R,
  ChangedOnly = false,
  Return extends "value" | "variable" | "result" = "result"
> = R extends {
  current: infer V;
  status: SuccessStatus<ChangedOnly>;
}
  ? V extends undefined
    ? undefined
    : Return extends "result"
    ? R
    : Return extends "variable"
    ? V
    : V extends { value: infer V }
    ? V
    : never
  : R extends { value?: infer V; status: SuccessStatus<ChangedOnly> }
  ? Return extends "result" | "variable"
    ? R
    : V
  : never;

export type VariableSuccessResults<
  Results,
  ChangedOnly extends boolean = false,
  Return extends "value" | "variable" | "result" = "result"
> = Results extends undefined
  ? undefined
  : Results extends readonly []
  ? []
  : Results extends readonly [infer Item, ...infer Rest]
  ? [
      VariableSuccessResult<Item, ChangedOnly, Return>,
      ...VariableSuccessResults<Rest, ChangedOnly, Return>
    ]
  : Results extends readonly (infer Item)[]
  ? VariableSuccessResult<Item, ChangedOnly, Return>[]
  : VariableSuccessResult<Results, ChangedOnly, Return>;

export type FilterVariableResults<
  Results,
  SuccessOnly extends boolean = false
> = If<SuccessOnly, Results, VariableSuccessResults<Results>>;

export type VariableResultPromise<
  T extends readonly any[] = readonly any[],
  Push = undefined
> = PromiseLike<VariableSuccessResults<T>> &
  PrettifyIntersection<
    {
      all: PromiseLike<T>;
      changed: PromiseLike<VariableSuccessResults<T, true>>;
      values: PromiseLike<VariableSuccessResults<T, false, "value">>;
    } & (Push extends true | ((arg: any) => void)
      ? { push(): VariableResultPromise<T, false> }
      : {}) &
      (T["length"] extends 1
        ? {
            value: PromiseLike<VariableSuccessResults<T, false, "value">[0]>;
            0: PromiseLike<Exclude<VariableSuccessResults<T>[0], undefined>>;
          }
        : {})
  >;

export const toVariableResultPromise = <T extends readonly any[], Push>(
  results: () => PromiseLike<T>,
  push?: Push &
    ((results: Exclude<VariableSuccessResult<T[number]>, undefined>[]) => void)
): VariableResultPromise<T, Push> => {
  let mapResults = (results: any): any[] => results;
  const promise = {
    then: thenMethod(async () =>
      mapResults(handleResultErrors(await results()))
    ) as any,
    all: thenable(async () => mapResults(await results())) as any,
    changed: thenable(async () =>
      mapResults(handleResultErrors(await results(), true))
    ) as any,
    push: () => (
      (mapResults = (results) => (
        push?.((getSuccessResults(results) as any[]).filter((item) => item)),
        results
      )),
      promise as any
    ),
    values: thenable(async () =>
      mapResults(handleResultErrors(await results()))?.map(
        (result) => getResultVariable(result)?.value
      )
    ),
    value: thenable(
      async () =>
        getResultVariable(mapResults(handleResultErrors(await results()))[0])
          ?.value
    ) as any,
    0: thenable(async () => handleResultErrors(await results())[0]) as any,
  };
  return promise as any;
};

type ValidatableResult =
  | {
      status: VariableResultStatus;
      current?: Variable<any, true>;
      error?: any;
      source?: VariableSetter;
    }
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
    ? undefined
    : R extends { current: infer V }
    ? V
    : R extends { value: infer T }
    ? Variable<T, true>
    : never
> =>
  result?.status! < 400
    ? (result as VariableSetResult)?.current ?? (result as any)
    : undefined;

export const isSuccessResult = <
  T extends VariableGetResult | VariableSetResult | undefined
>(
  result: T
): result is T &
  (T extends VariableGetResult
    ? VariableGetSuccessResult
    : T extends VariableSetResult
    ? VariableSetSuccessResult
    : undefined) => result?.status! < 400;

export const handleResultErrors = <
  Results extends MaybeArray<ValidatableResult, true>,
  Throw extends boolean = true
>(
  results: Results,
  throwErrors: Throw = true as any
): FilterVariableResults<Results, Throw> => {
  if (!throwErrors || !results) {
    return results as any;
  }

  if (isArray(results)) {
    return apply(results, handleResultErrors, throwErrors) as any;
  }

  return results.status < 400 || results.status === 404 // Not found can only occur for get requests, and those are all right.
    ? (results as any)
    : throwError(
        `${formatKey(
          (results as VariableSetResult).source ?? results
        )} could not be ${
          (results as VariableSetResult).source ||
          results.status !== VariableResultStatus.Error
            ? "set"
            : "read"
        } because ${
          results.status === VariableResultStatus.Conflict
            ? `of a conflict. The expected version '${results.source?.version}' did not match the current version '${results.current?.version}'.`
            : results.status === VariableResultStatus.Denied
            ? results.error ?? "the operation was denied."
            : results.status === VariableResultStatus.Invalid
            ? results.error ?? "the value does not conform to the schema"
            : results.status === VariableResultStatus.ReadOnly
            ? "it is read only."
            : results.status === VariableResultStatus.Error
            ? `of an unexpected error: ${results.error}`
            : "of an unknown reason."
        }`
      );
};
