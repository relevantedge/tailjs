import { Variable, VariableKey, VariableServerScope } from "@tailjs/types";
import { MaybeNullish, Nullish, createEnumParser } from "@tailjs/util";
import { CONSENT_INFO_KEY, SCOPE_INFO_KEY } from "@constants";
import type {
  LocalID,
  RestrictScopes,
  ServerScoped,
  SessionInfo,
  UserConsent,
  VariableGetRequest,
  VariableGetResponse,
  VariableGetResult,
  VariableGetter,
  VariableGetterCallback,
  VariablePollCallback,
  VariableResultPromiseResult,
  VariableSetResult,
  VariableSetter,
  VariableSetterCallback,
  View,
} from "@tailjs/types";

export type ReferringViewData = [
  viewId: LocalID,
  relatedEventId: LocalID | undefined
];

export interface CurrentView extends View {
  /**
   * If the view is updated, and this is set, it is considered navigation.
   * Use this if you have implemented custom navigation that does not make use of
   * history.push/replace.
   */
  navigation?: boolean;
}

export type ReservedTrackerVariables = {
  session: {
    [SCOPE_INFO_KEY]: SessionInfo;
    [CONSENT_INFO_KEY]: UserConsent;
  };
  view: {
    view: CurrentView;
    loaded: boolean;
    referrer: string;
  };
  shared: {
    tabIndex: number;
    viewIndex: number;
    referrer: [viewId: string | undefined, navigationEventId: string];
  };
};

const levels = {
  /**
   * Variables that are only available in memory in the current view, and lost as soon as the user navigates away (without bf_cache) or closes the browser.
   *
   * Data in this scope may be used without user consent (anonymous tracking), however if it is used in logic for event tracking
   * make sure it does not contain personal information that may identify the user, hence violate the premise for the otherwise anonymously
   * collected data.
   *
   *
   */
  view: "view",

  /**
   * Variables that are only available in the current tab, including between views in the same tab as navigation occurs, but lost as soon as the user closes the tab.
   *
   * Data is encrypted at rest, yet only available if the user has consented to data being stored for the variables' purposes.
   */
  tab: "tab",

  /**
   * Variables that are shared between open tabs, and lost as soon as the last tab is closed.
   * These variables are kept entirely in memory and shared via messaging which means they are never persisted in the user's
   * device between browser restarts.
   *
   * Use the server-side scopes `session`, `device` or `user` if the data must be persisted for a longer duration.
   */
  shared: "shared",
} as const;

export type LocalVariableScope = (typeof levels)[keyof typeof levels];

export type AnyVariableScope = VariableServerScope | LocalVariableScope;

export const localVariableScope = createEnumParser(
  "local variable scope",
  levels
);

export const anyVariableScope = createEnumParser("variable scope", {
  ...localVariableScope,
  ...VariableServerScope,
});

export type ClientScoped<
  Target,
  LocalOnly extends boolean = boolean
> = LocalOnly extends true
  ? RestrictScopes<Target, LocalVariableScope, never>
  : ServerScoped<Target, true>;

export type ClientVariableKey<LocalOnly extends boolean = boolean> =
  ClientScoped<VariableKey, LocalOnly>;

export type ClientVariable<
  T extends {} = any,
  LocalOnly extends boolean = boolean
> = ClientScoped<Variable<T>, LocalOnly>;

export type ClientVariableGetter<
  T extends {} = any,
  LocalOnly extends boolean = boolean
> = ClientScoped<VariableGetter<T>, LocalOnly> & {
  /**
   * This will be called with the result.
   *
   * Return `true` from the callback to poll for changes, that is, the callback will be invoked again next time the variable changes
   * until it returns something else than `true`.
   */
  callback?: ClientVariableGetterCallback<T, LocalOnly>;

  /**
   * This will be called with the value of the variable whenever a change is detected in the local cache
   * until the callback returns something different than `true`.
   *
   */
  poll?: VariablePollCallback<T>;
} & Pick<VariableGetRequest, "passive"> &
  VariableCacheSettings;

export type ClientVariableSetter<
  T extends {} = any,
  LocalOnly extends boolean = boolean
> = ClientScoped<VariableSetter<T>, LocalOnly> & {
  callback?: ClientVariableSetterCallback<T, LocalOnly>;
};

export type ClientVariableGetResult<
  T extends {} = any,
  LocalOnly extends boolean = boolean
> = ClientScoped<
  VariableResultPromiseResult<"get", VariableGetResult<T>> &
    Pick<VariableGetResponse, "passive">,
  LocalOnly
>;

export type ClientVariableSetResult<
  T extends {} = any,
  LocalOnly extends boolean = boolean
> = ClientScoped<
  VariableResultPromiseResult<"set", VariableSetResult<T>>,
  LocalOnly
>;

export type ClientVariableGetterCallback<
  T extends {} = any,
  LocalOnly extends boolean = boolean
> = VariableGetterCallback<ClientScoped<VariableKey, LocalOnly>, T>;

export type ClientVariableSetterCallback<
  T extends {} = any,
  LocalOnly extends boolean = boolean
> = VariableSetterCallback<ClientScoped<VariableKey, LocalOnly>, T>;

export type VariableCacheSettings = {
  /**
   * The maximum number of milliseconds the value of this variable can be cached.
   * If omitted or `true` the default value of 3 seconds will be used.
   * `false` or 0 means the variable will not be cached.
   */
  cache?: number | boolean;
};

export const maskEntityId = <T extends { scope: string; entityId?: string }>(
  key: T
): T & ClientScoped<VariableKey> => (
  key["scope"] !== "global" && key["entityId"] && (key["entityId"] = undefined),
  key as any
);

export const isLocalScopeKey = (
  key: { scope: string } | Nullish
): key is {
  scope: LocalVariableScope;
} => (key?.scope ? localVariableScope.ranks[key.scope] != null : false);

export const variableKeyToString: <S extends ClientVariableKey | Nullish>(
  key: S
) => MaybeNullish<string, S> = (key: ClientVariableKey | Nullish): any =>
  key == null ? key : [key.scope, key.key, key.entityId].join("\0");

export const stringToVariableKey = (key: string): ClientVariableKey => {
  const parts = key.split("\0");
  return {
    scope: parts[0] as any,
    key: parts[1],
    entityId: parts[2],
  } satisfies ClientVariableKey;
};
