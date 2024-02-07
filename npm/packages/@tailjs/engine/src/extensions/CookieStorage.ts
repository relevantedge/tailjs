import {
  VariableGetRequest,
  VariableGetResponse,
  VariableScope,
  VariableSetRequest,
} from "@tailjs/types";
import {
  clear,
  filter,
  forEach,
  isUndefined,
  map,
  set,
  update,
} from "@tailjs/util";
import {
  Tracker,
  TrackerEnvironment,
  TrackerExtension,
  VariableStore,
} from "..";

export class CookieStorage implements VariableStore, TrackerExtension {
  id = "cookies";
  tags = ["*", "runtime"];

  private _variables: WeakMap<Tracker, VariableSetRequest> = new WeakMap();

  async apply(tracker: Tracker): Promise<void> {
    const cookieNames = tracker._requestHandler._cookieNames;
    const variables = update(
      this._variables,
      tracker,
      (current) => current ?? {}
    );

    const session = (variables["session"] ??= {});
    const deviceSession = (variables["device-session"] ??= {});
    const device = (variables["device"] ??= {});

    forEach(
      [
        [cookieNames.essentialSession, true],
        [cookieNames.optInSession, false],
      ] as const,
      ([cookie, essential]) =>
        forEach(
          tracker.env.httpDecrypt(tracker.cookies[cookie]?.value) ?? {},
          ([key, value]) => {
            session[key] = {
              value,
              consentLevel: essential ? "essential" : "user-data",
            };
          }
        )
    );

    forEach(
      [
        [cookieNames.essentialIdentifiers, true],
        [cookieNames.optInIdentifiers, false],
      ] as const,
      ([cookie, essential]) =>
        forEach(
          tracker.env.httpDecrypt(
            tracker.cookies[cookieNames.essentialSession]?.value
          ) ?? {},
          ([key, value]) => {
            const parts =
              tracker.env.httpDecrypt(tracker.cookies[cookie]?.value) ?? [];
            forEach(
              parts?.[0] ?? {},
              ([key, value]) =>
                (deviceSession[key] = {
                  value,
                  consentLevel: essential ? "essential" : "user-data",
                })
            );
            forEach(
              parts?.[1] ?? {},
              ([key, value]) =>
                (device[key] = {
                  value,
                  consentLevel: essential ? "essential" : "user-data",
                })
            );
          }
        )
    );
  }

  public async getAll(
    scope: VariableScope | null,
    tracker: Tracker
  ): Promise<Partial<Record<VariableScope, Record<string, any>>>> {
    const response: VariableGetResponse = {};

    const variables = update(
      this._variables,
      tracker,
      (current) => current ?? {}
    );

    forEach(variables, ([scopeKey, values]) => {
      if (!scope || scopeKey === scope) {
        forEach(values, ([name, { value }]) => {
          value && ((response[scopeKey] ??= {})[name] = value);
        });
      }
    });

    return response;
  }
  public async get(
    variables: VariableGetRequest,
    tracker: Tracker
  ): Promise<VariableGetResponse> {
    const response: VariableGetResponse = {};
    const trackerVariables = update(
      this._variables,
      tracker,
      (current) => current ?? {}
    );

    forEach(variables, ({ key: name, scope = "session", tags }) => {
      const value = trackerVariables[scope]?.[name]?.value;
      value && ((response[scope] ??= {})[name] = value);
    });

    return response;
  }

  public async set(
    variables: VariableSetRequest,
    tracker: Tracker
  ): Promise<void> {
    if (tracker.consentLevel === "none") return;
    const trackerVariables = update(
      this._variables,
      tracker,
      (current) => current ?? {}
    );

    forEach(variables, ([scope, values]) =>
      forEach(values, ([key, value]) =>
        set(
          (trackerVariables[scope] ??= {}),
          key,
          isUndefined(value.value) || (value.ttl as any) <= 0
            ? undefined
            : value
        )
      )
    );

    this._filterVariables(tracker);
  }

  private _filterVariables(tracker: Tracker) {
    forEach(
      this._variables.get(tracker),
      ([scope, values]) =>
        values &&
        clear(
          values,
          ...map(
            filter(
              values,
              ([, value]) =>
                value.consentLevel !== "none" &&
                (tracker.consentLevel === "none" ||
                  (value.consentLevel === "user-data" &&
                    tracker.consentLevel === "essential"))
            ),
            ([key]) => key
          )
        )
    );
    return this._variables;
  }

  async purge(scopes: VariableScope[] | null, tracker: Tracker): Promise<void> {
    const variables = update(
      this._filterVariables(tracker),
      tracker,
      (current) => current ?? {}
    );

    forEach(
      scopes ?? ["session", "device-session", "device"],
      (scopeKey: VariableScope) => {
        clear(variables, scopeKey);
      }
    );
  }

  async persist(tracker: Tracker, env: TrackerEnvironment): Promise<void> {
    const cookieNames = tracker._requestHandler._cookieNames;

    const variables = update(
      this._filterVariables(tracker),
      tracker,
      (current) => current ?? {}
    );

    const getScopeValues = (scope: VariableScope, essential: boolean) => {
      const values =
        tracker.consentLevel === "none" || !variables[scope]
          ? []
          : filter(
              variables[scope],
              ([, value]) => value.consentLevel === "essential" || !essential,
              true
            );

      if (values.length) {
        return set(
          {},
          map(values, ([key, value]) => [key, value.value])
        );
      }
      return undefined;
    };

    forEach(
      [
        [cookieNames.essentialSession, true],
        [cookieNames.optInSession, false],
      ] as const,
      ([cookie, essential]) =>
        (tracker.cookies[cookie] = {
          httpOnly: true,
          sameSitePolicy: "None",
          value: env.httpEncrypt(getScopeValues("session", essential)),
        })
    );

    forEach(
      [
        [cookieNames.essentialIdentifiers, true],
        [cookieNames.optInIdentifiers, false],
      ] as const,
      ([cookie, essential]) => {
        const deviceSession = getScopeValues("device-session", essential);
        const device = getScopeValues("device", essential);
        tracker.cookies[cookie] = {
          httpOnly: true,
          sameSitePolicy: "None",
          maxAge: 34560000,
          value:
            deviceSession || device
              ? env.httpEncrypt([deviceSession, device])
              : null,
        };
      }
    );
  }
}
