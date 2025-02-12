import { VariableExplicitServerScopes, VariableServerScope } from "../..";

/**
 * Helper "function" to allow all scopes to be shown via intellisense. Otherwise, vscode won't show e.g. "global"
 * before an entityId has been provided.
 */
export type RevealAllScopes<T> = T extends readonly any[]
  ? { [P in keyof T]: RevealAllScopes<T[P]> }
  : T extends { entityId?: undefined }
  ? Omit<T, "entityId"> & ({} | { entityId: undefined })
  : T;

export type MatchScopes<Target, KeyType> = unknown extends Target
  ? any
  : Target extends readonly any[]
  ? { [P in keyof Target]: MatchScopes<Target[P], KeyType> }
  : Target extends { scope: string }
  ? KeyType extends { scope: string }
    ? Omit<Target, "entityId"> &
        Pick<
          KeyType,
          keyof Target & keyof KeyType & ("scope" | "entityId")
        > extends infer T
      ? { [P in keyof T]: T[P] }
      : never
    : never
  : Target;

/**
 * Split a type the extends VariableKey into two version:
 *  - Explicit scopes where entityId is required
 *  - Implicit scopes where the entityId is implied, so it must either be omitted or undefined.
 *
 * It is possible to have the same scope both explicitly and implicitly for a generic signature for helper functions.
 */
export type RestrictScopes<
  Target,
  Scopes extends string = string,
  Explicit extends Scopes = Scopes,
  Implicit extends Scopes = Exclude<Scopes, Explicit>
> = MatchScopes<
  Target,
  unknown extends Scopes
    ? any
    : unknown extends Explicit
    ? { scope: Scopes; entityId?: string }
    : Exclude<
        | { scope: Exclude<Implicit, Explicit>; entityId?: undefined }
        | { scope: Exclude<Explicit, Implicit>; entityId: string }
        | { scope: Explicit & Implicit; entityId?: string },
        { scope: never }
      >
>;

type _ExplicitServerScopes<Scope extends boolean> =
  | VariableExplicitServerScopes
  | (Scope extends true ? never : VariableServerScope);

export type ServerScoped<Target, Scope extends boolean = true> = RestrictScopes<
  Target,
  VariableServerScope,
  _ExplicitServerScopes<Scope>,
  [boolean] extends [Scope]
    ? Exclude<VariableServerScope, VariableExplicitServerScopes>
    : Exclude<VariableServerScope, _ExplicitServerScopes<Scope>>
>;

export type RemoveScopeRestrictions<
  KeyType,
  Covariant = false // Set this to true if removing scope restrictions for something that is a return value of a function.
> = KeyType extends infer KeyType
  ? Omit<KeyType, "scope" | "entityId"> &
      (Covariant extends true
        ? { scope: any; entityId?: any }
        : { scope: any; entityId: any })
  : never;
