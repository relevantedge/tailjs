export type Expand<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
  ? T extends infer O
    ? { [K in keyof O]: O[K] }
    : never
  : T;

export type SemiPartial<T, K extends keyof T> = Pick<T, K> &
  Partial<Omit<T, K>>;

export type ExpandDeep<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandDeep<O[K]> }
    : never
  : T;

export type ReadOnlyRecord<
  K extends string | number = string | number,
  V = any
> = { readonly [P in K]: V };

export type AllRequired<T> = {
  [P in keyof T]-?: AllRequired<T[P]>;
};

export type UnionToIntersection<T> = (
  T extends any ? (x: T) => any : never
) extends (x: infer R) => any
  ? R
  : never;
