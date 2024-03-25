export * from "./transformLocalIds";
export * from "./parseTagString";

/**
 *  No-op function to validate event types in TypeScript. Because function parameters are contravariant, passing an event that does not match on all properties will get red wiggly lines)
 *
 */
export const cast: {
  <T extends any[] | undefined>(item: T extends (infer T)[] ? T : never);
  <T>(item: T): T;
} = (item: any) => item as any;
