import { Component, FunctionComponent } from "react";
import { Nullish } from "./internal";
import { concat2 } from "@tailjs/util";

export type ExcludeRule = (type: any) => boolean;

export type IncludeExcludeRules =
  | (
      | RegExp
      | string
      | FunctionComponent<any>
      | Component<any>
      | Nullish
      | { match: ExcludeRule }
    )[];

const parseRules = (
  rules: IncludeExcludeRules | Nullish,
  invert = false
): ExcludeRule | undefined => {
  if (rules == null) return undefined;

  let expressions: RegExp[] | undefined;
  let names: Set<string> | undefined;
  let matchers: ExcludeRule[] | undefined;
  let set: Set<any> | undefined;
  for (const rule of rules) {
    if (!rule) continue;
    if (typeof rule === "string") {
      (names ??= new Set()).add(rule);
    } else if (rule instanceof RegExp) {
      (expressions ??= []).push(rule);
    } else if ("match" in rule) {
      (matchers ??= []).push(rule.match);
    } else {
      (set ??= new Set()).add(rule);
    }
  }
  if (!expressions && !names && !set && !matchers) {
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
          expressions?.some((matcher) =>
            typeof type === "string"
              ? type.match(matcher)
              : (type.name?.match(matcher) ||
                  type.displayName?.match(matcher)) &&
                (set ??= new Set()).add(type)
          ) ||
          matchers?.some((matcher) => matcher(type)) ||
          false))
    );
};

export const concatRules = (
  first: IncludeExcludeRules | Nullish,
  second: IncludeExcludeRules | Nullish
): IncludeExcludeRules | undefined =>
  first || second ? concat2(first, second) : undefined;

export const compileIncludeExcludeRules = (
  include: IncludeExcludeRules | Nullish,
  exclude: IncludeExcludeRules | Nullish
): ExcludeRule | undefined => {
  const includeRule = parseRules(include, true);
  const excludeRule = parseRules(exclude, false);
  if (!includeRule) return excludeRule ?? undefined;
  if (!excludeRule) return includeRule;
  return (el): boolean => !includeRule(el) || excludeRule(el);
};
