type CreateArray<Len, Ele, Arr extends Ele[] = []> = Arr["length"] extends Len
  ? Arr
  : CreateArray<Len, Ele, [Ele, ...Arr]>;

export type Add<A extends number, B extends number> = [
  ...CreateArray<A, 1>,
  ...CreateArray<B, 1>
]["length"] &
  number;

export type Minus<A extends number, B extends number> = CreateArray<
  A,
  1
> extends [...CreateArray<B, 1>, ...infer R]
  ? R["length"] & number
  : never;
