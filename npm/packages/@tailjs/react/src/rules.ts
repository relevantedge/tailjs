import { Component, FunctionComponent } from "react";
import { Nullish } from "./internal";

export type ExcludeRule = (type: any) => boolean;

export type IncludeExcludeRules =
  | (RegExp | string | FunctionComponent<any> | Component<any> | Nullish)[]
  | ExcludeRule;

const parseRules = (
  rules: IncludeExcludeRules | Nullish,
  invert = false
): ExcludeRule | undefined => {
  if (rules == null) return undefined;
  if (typeof rules === "function") return rules;

  let matchers: RegExp[] | undefined;
  let names: Set<string> | undefined;
  let set: Set<any> | undefined;
  for (const rule of rules) {
    if (typeof rule === "string") {
      (names ??= new Set()).add(rule);
    } else if (rule instanceof RegExp) {
      (matchers ??= []).push(rule);
    } else {
      (set ??= new Set()).add(rule);
    }
  }
  if (!matchers && !names && !set) {
    return undefined;
  }
  return (type: any) =>
    !!(
      (invert as any) ^
      (type &&
        (set?.has(type) ||
          (typeof type === "string"
            ? names?.has(type)
            : names?.has(type.name) || names?.has(type.displayName)) ||
          matchers?.some((matcher) =>
            typeof type === "string"
              ? type.match(matcher)
              : (type.name?.match(matcher) ||
                  type.displayName?.match(matcher)) &&
                (set ??= new Set()).add(type)
          ) ||
          false))
    );
};

export const concatRules = (
  first: IncludeExcludeRules | Nullish,
  second: IncludeExcludeRules | Nullish
): IncludeExcludeRules | undefined =>
  first
    ? second
      ? Array.isArray(first) && Array.isArray(second)
        ? first.concat(second)
        : ((first = parseRules(first)),
          (second = parseRules(second)),
          (type) => first!(type) || second!(type))
      : first
    : second ?? undefined;

export const compileIncludeExcludeRules = (
  include: IncludeExcludeRules | Nullish,
  exclude: IncludeExcludeRules | Nullish
): ExcludeRule | undefined => {
  include = parseRules(include, true);
  exclude = parseRules(exclude, false);
  if (!include) return exclude ?? undefined;
  if (!exclude) return include;
  return (el): boolean => !(include as any)(el) || (exclude as any)(el);
};
