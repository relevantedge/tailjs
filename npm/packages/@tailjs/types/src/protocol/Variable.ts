import {
  EnumValue,
  MaybeUndefined,
  Nullish,
  PrettifyIntersection,
  createEnumAccessor,
  isUndefined,
} from "@tailjs/util";
import {
  DataClassification,
  DataClassificationValue,
  DataPurposeFlags,
  DataPurposeValue,
  Timestamp,
  dataClassification,
  dataPurposes,
  singleDataPurpose,
} from "..";

export enum VariableScope {
  /** Global variables. */
  Global = 0,

  /**
   * Variables related to an external identity.
   * One use case could be used to augment data a CMS with real-time data related to personalization or testing.
   */
  Entity = 1,

  /** Variables related to sessions. */
  Session = 2,

  /** Variables related to a device (browser or app). */
  Device = 3,

  /** Variables related to an identified user. */
  User = 4,
}

export const variableScope = createEnumAccessor(
  VariableScope as typeof VariableScope,
  false,
  "variable scope"
);

export type VariableScopeValue<Numeric extends boolean | undefined = boolean> =
  EnumValue<typeof VariableScope, VariableScope, false, Numeric> extends infer T
    ? T
    : never;

/** Transforms properties with known enum types to their parsable counterparts. */
export type Parsable<T, Numeric extends boolean | undefined = boolean> = {
  [P in keyof T]: T[P] extends DataClassification | undefined | null
    ? DataClassificationValue<MaybeUndefined<T[P], Numeric>>
    : T[P] extends DataPurposeFlags | undefined | null
    ? DataPurposeValue<MaybeUndefined<T[P], Numeric>>
    : T[P] extends VariableScope | undefined | null
    ? VariableScopeValue<MaybeUndefined<T[P], Numeric>>
    : Parsable<T[P], Numeric>;
};

/**
 * Uniquely addresses a variable by scope, target and key name.
 */
export interface VariableKey<NumericEnums extends boolean = boolean> {
  /** The scope the variable belongs to. */
  scope: VariableScopeValue<NumericEnums>;

  /**
   * The name of the variable.
   *
   * A key may have a prefix that decides which variable storage it is routed to.
   * The prefix and the key are separated by colon (`prefix:key`). Additional colons will be considered part of the variable name.
   * To address a variable with a colon in its name without prefix use `:key`, for example `:colon:in:my:name`.
   */
  key: string;

  /**
   * The ID of the entity in the scope the variable belongs to.
   * This is ignored for global variables, and can be set to `""`.
   */
  targetId?: string;
}

type RestrictVariableItemTargets<
  T extends readonly any[],
  LocalScopes extends boolean
> = T extends readonly []
  ? []
  : T extends [infer Item, ...infer Rest]
  ? [
      RestrictVariableTargets<Item, LocalScopes>,
      ...RestrictVariableItemTargets<Rest, LocalScopes>
    ]
  : T extends readonly (infer T)[]
  ? RestrictVariableTargets<T, LocalScopes>[]
  : never;

export type RestrictVariableTargets<
  T,
  LocalScopes extends boolean = true
> = boolean extends LocalScopes
  ? T
  : T extends readonly any[]
  ? RestrictVariableItemTargets<T, LocalScopes>
  : PrettifyIntersection<
      T extends { scope: any; targetId?: any }
        ? T &
            (
              | {
                  scope:
                    | VariableScope.Global
                    | "global"
                    | (LocalScopes extends true
                        ?
                            | VariableScope.User
                            | "user"
                            | VariableScope.Device
                            | "device"
                            | VariableScope.Session
                            | "session"
                        : never);
                  targetId?: undefined;
                }
              | {
                  scope:
                    | (LocalScopes extends true
                        ? never
                        :
                            | VariableScope.User
                            | "user"
                            | VariableScope.Device
                            | "device"
                            | VariableScope.Session
                            | "session")
                    | VariableScope.Entity
                    | "entity";
                  targetId: string;
                }
            )
        : T
    >;

/**
 * A {@link VariableKey} that optionally includes the expected version of a variable value.
 * This is used for "if none match" queries to invalidate caches efficiently.
 */
export interface VersionedVariableKey<NumericEnums extends boolean = boolean>
  extends VariableKey<NumericEnums> {
  version?: string;
}

/**
 * Defines how the value of variable is classified and for which purposes it can be used.
 */
export interface VariableClassification<
  NumericEnums extends boolean = boolean
> {
  /**
   * The legal classification of the kind of data a variable holds.
   * This limits which data will be stored based on a user's consent.
   */
  classification: DataClassificationValue<NumericEnums>;

  /**
   * Optionally defines the possible uses of the data a variables holds (they are binary flags).
   * When a variable is requested by some logic, it may be stated what the data is used for.
   * If the user has not consented to data being used for this purpose the variable will not be avaiable.
   */
  purposes: DataPurposeValue<NumericEnums>;
}

export interface VariableMetadata {
  /**
   * Optionally categorizes variables.
   *
   * For example, the tag `address` could be used for all variables related to a user's address,
   * or `newsletter` for everything related to newsletter subscriptions.
   */
  tags?: string[];
}

/**
 * Information about when a variable's value was modified and a unqiue version (ETag) used for conflict resolution
 * in case multiple processes try to update it at the same time (optimistic concurrency).
 *
 * Only the version, and not the modified timestamp must be relied on during conflict resolution.
 */
export interface VariableVersion {
  /**
   * Timestamp for when the variable was created.
   */
  created?: Timestamp;

  /**
   * Timestamp for when the variable was created or modified.
   */
  modified?: Timestamp;

  /**
   * A unique token that changes everytime a variable is changed.
   * It follows the semantics of a "weak" ETag in the HTTP protocol.
   * How the value is generated is an internal implementation detail specific to the storage that manages the variable.
   *
   * The value is only undefined if it is not assumed to exist before a set operation.
   */
  version?: string | undefined;
}

/**
 * All data related to a variable except its value.
 */
export interface VariableHeader<NumericEnums extends boolean = true>
  extends VariableKey<NumericEnums>,
    VariableClassification<NumericEnums>,
    VariableMetadata,
    VariableVersion {}

/**
 * A variable is a specific piece of information that can be classified and changed independently.
 * A variable can either be global or related to a specific entity or tracker scope.
 */
export interface Variable<T = any, NumericEnums extends boolean = true>
  extends VariableHeader<NumericEnums> {
  /**
   * The value of the variable is read-only. Trying to update its value in its storage will result in an error.
   */
  readonly?: boolean;

  /**
   * The value of the variable. It must only be undefined in a set operation in which case it means "delete".
   */
  value: T;
}

/**
 * The information needed about a variable to validate whether it complies with a user's consents,
 * or meets other authorization based requirements.
 */
export type VariableValidationBasis<NumericEnums extends boolean = boolean> =
  VariableKey<NumericEnums> & Partial<VariableClassification<NumericEnums>>;

/** Returns a description of a key that can be used for logging and error messages.  */
export const formatKey = (key: VariableKey<true> | VariableKey) =>
  `'${key.key}' in ${variableScope.format(key.scope)} scope`;

/** The individual parts of a key specifed as string. */
export type ParsedKey = {
  /** The prefix of the key, or the empty string if none. */
  prefix: string;

  /** The excluding its prefix. */
  key: string;

  /** The original key string. */
  sourceKey: string;

  /** For queries. */
  not?: boolean;
};

export const stripPrefix = <T extends VariableKey | undefined>(key: T): T =>
  key && { ...key, key: parseKey(key.key).key };

/** Returns the individual parts of a key specified as a string.  */
export const parseKey = <T extends string | undefined>(
  sourceKey: T
): MaybeUndefined<T, ParsedKey> => {
  if (isUndefined(sourceKey)) return undefined as any;
  const not = sourceKey[0] === "!";
  if (not) {
    sourceKey = (sourceKey.slice(1) as T)!;
  }
  const prefixIndex = sourceKey.indexOf(":");
  const prefix = prefixIndex < 0 ? "" : sourceKey.substring(0, prefixIndex);
  const key = prefixIndex > -1 ? sourceKey.slice(prefixIndex + 1) : sourceKey;

  return {
    prefix,
    key,
    sourceKey,
    not,
  } as any;
};

type EnumPropertyType<
  P extends keyof any,
  Default,
  Props
> = Props extends readonly []
  ? Default
  : Props extends readonly [
      readonly [infer Key, { values: (infer T)[] }],
      ...infer Rest
    ]
  ? P extends Key
    ? T
    : EnumPropertyType<P, Default, Rest>
  : never;

const enumProperties = [
  ["scope", variableScope],
  ["purpose", singleDataPurpose],
  ["purposes", dataPurposes],
  ["classification", dataClassification],
] as const;

export const toNumericVariableEnums: <T>(value: T) => T extends Nullish
  ? T
  : {
      [P in keyof T]: EnumPropertyType<P, T[P], typeof enumProperties>;
    } = (value: any) => {
  if (!value) return value;

  enumProperties.forEach(
    ([prop, helper]) =>
      value[prop] !== undefined && (value[prop] = helper.parse(value[prop]))
  );

  return value as any;
};

export const extractKey = <T extends VariableKey>(
  variable: T,
  classificationSource?: T extends VariableKey<infer NumericEnums>
    ? VariableClassification<NumericEnums>
    : never
): T extends undefined ? undefined : T & VariableKey<true> =>
  variable
    ? ({
        scope: variableScope(variable.scope),
        targetId: variable.targetId,
        key: variable.key,
        ...(classificationSource && {
          classification: classificationSource.classification,
          purposes: classificationSource.purposes,
        }),
      } as Required<VariableKey> as any)
    : undefined;
