/**
 * The scope for a variable including the entity it relates to and its life time..
 */
export type VariableServerScope =
  /**
   * Variables that are not bound to individuals, does not contain personal data, and not subject to censoring.
   * These may be used for purposes such as shared runtime configuration
   * or augmenting external entities with real-time data for personalization or testing.
   */
  | "global"

  /**
   * Variables that relates to an individual's current session. These are purged when the session ends.
   *
   * Session variables can only be read for the current session from untrusted contexts.
   */
  | "session"

  /**
   * Variables that relates to an individual's device.
   *
   * These variables are physically stored in the device where the available space may be very limited.
   * For example, do not exceed a total of 2 KiB if targeting web browsers.
   *
   * To prevent race conditions between concurrent requests, device data may temporarily be loaded into session storage.
   *
   * Any data stored here is per definition at least `indirect` since it is linked to a device.
   */
  | "device"

  /**
   * Variables that relates to an individual across devices.
   *
   * Associating a user ID with a session can only happen from a trusted context,
   * but data for the associated user can then be read from untrusted contexts unless a `trusted-only` restriction is put on the data.
   *
   * Any data stored here is per definition at least `direct` since it directly linked to an individual.
   */
  | "user";

export type VariableExplicitServerScopes = "global";

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
