type CreateArray<
  Len,
  Ele = 1,
  Arr extends Ele[] = []
> = Arr["length"] extends Len ? Arr : CreateArray<Len, Ele, [Ele, ...Arr]>;

export type Add<A extends number, B extends number> = [
  ...CreateArray<A, 1>,
  ...CreateArray<B, 1>
]["length"] &
  number;

export type Negate<N extends number> = N extends 0
  ? 0
  : `${N}` extends `-${infer S extends number}`
  ? S
  : `-${N}` extends `${infer S extends number}`
  ? S
  : never;

export type Subtract<A extends number, B extends number> = CreateArray<
  A,
  1
> extends [...CreateArray<B, 1>, ...infer R]
  ? R["length"] & number
  : never;
