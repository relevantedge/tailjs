import { isBoolean } from "@tailjs/util";

/**
 * Round a number of to the specified number of decimals.
 */
export const round = (x: number, decimals: number | boolean = 0) =>
  (isBoolean(decimals) ? --(decimals as any) : decimals) < 0
    ? x
    : ((decimals = Math.pow(10, decimals as any)),
      Math.round(x * decimals) / decimals);
