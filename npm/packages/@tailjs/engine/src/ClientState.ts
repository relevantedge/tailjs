import { any, clone, equals } from "./lib";
import { RequestHandler, Tracker } from "./shared";
import { Encodable, EncodableObject } from "@tailjs/util";

export const CLIENT_STATE_DATA_VERSION = 2;

export interface ClientScope {
  id: string;
  views: number;
}

export interface Session extends ClientScope {
  isNew: boolean;
  persisted: boolean;
  previous: number | undefined;
  started: number;
  lastSeen: number | undefined;

  reset(): Promise<void>;
}

export interface Device extends ClientScope {
  deviceSessions: number;
  sessions: number;
}

type TrackerVariableLayout = [
  server?: EncodableObject | undefined,
  client?: EncodableObject | undefined
];

type ClientScopeDataLayout = [
  timestamp: number, // 0
  id: string, // 1
  views: number, // 2
  essential: TrackerVariableLayout | undefined // 3
];

type SessionDataLayout = [
  ...scope: ClientScopeDataLayout,
  previous: number | undefined, //4
  started: number, // 5
  persisted: boolean //6
];

type EssentialSessionDataLayout = [...session: SessionDataLayout];

type DeviceDataLayout = [
  ...scope: ClientScopeDataLayout,
  sessions: number, // 4
  deviceSessions: number, // 5
  previousSession: number | undefined, // 6
  previousDeviceSession: number | undefined, // 7
  deviceSession: SessionDataLayout // 8
];

type EssentialDeviceDataLayout = [
  ...device: DeviceDataLayout,
  consent: [timestamp: number | undefined, active: boolean] | undefined, // 9,
  username: string | undefined // 10
];

type OptInSessionDataLayout = [data?: TrackerVariableLayout];

type OptInDeviceDataLayout = [
  device?: TrackerVariableLayout,
  deviceSession?: TrackerVariableLayout
];

type AffinityDataLayout = [
  timestamp: number,
  essentialSession: EssentialSessionDataLayout,
  essentialDevice: EssentialDeviceDataLayout,
  optInSession: OptInSessionDataLayout | undefined,
  optInDevice: OptInDeviceDataLayout | undefined
];

const enum Purge {
  None = 0,
  Session = 1,
  All = 2,
}

export type TrackerVariable = {
  /**
   * The scope of the variable.
   */
  scope: "session" | "device-session" | "device";

  /**
   * If the variable is essential (e.g. can be stored without consent).
   *
   * Be afraid.
   *
   */
  essential: boolean;

  /**
   * Should the variable be available client-side (e.g. for personalization).
   *
   * @default false
   */
  client?: boolean;

  /**
   * Is the value of this variable critical to recover in the event that the client lost its cookies (e.g. Firefox shutting down).
   */
  critical?: boolean;

  /**
   * The value of the variable
   */
  value: Encodable;
};

const enum VariableScope {
  Session = "session",
  DeviceSession = "device-session",
  Device = "device",
}

// const getVariableIndex = (value: TrackerVariable) =>
//   (value.scope === VariableScope.Session ? 0 : value.scope === VariableScope.DeviceSession ? 2 : 4) +
//   +!value.essential +
//   (value.client ? 6 : 0);

// const splitVariables = (vars: Record<string, TrackerVariable>) => {
//   const set = [] as any as RequestVariables;
//   Object.entries(vars)
//     .filter(([_, value]) => value.client)
//     .forEach(
//       ([key, value]) => ((set[getVariableIndex(value)] ??= {})[key] = value)
//     );
//   return set;
// };

const packVariables = (
  vars: Record<string, TrackerVariable>,
  scope: VariableScope | null,
  essential: boolean | null
): TrackerVariableLayout | undefined => {
  const layout: TrackerVariableLayout = [];

  Object.entries(vars)
    .filter(
      ([_, value]) =>
        (scope == null || value.scope === scope) &&
        (essential == null || !!value.essential == essential) &&
        value.value !== undefined
    )
    .forEach(
      ([key, value]) =>
        ((layout[value.client ? 1 : 0] ??= {})[key] = value.value)
    );
  return layout.length ? layout : undefined;
};

const unpackVariables = (
  target: Record<string, TrackerVariable>,
  set: TrackerVariableLayout | undefined,
  scope: VariableScope,
  essential: boolean
) =>
  Array.isArray(set) &&
  set.map(
    (vars, client) =>
      vars &&
      Object.entries(vars).forEach(
        ([key, value]) =>
          (target[key] = { scope, essential, client: !!client, value })
      )
  );

export class ClientState {
  private readonly _cookieNames: RequestHandler["_cookieNames"];

  private _affinity: Encodable | undefined;
  private _purge: Purge = Purge.None;
  private _timestamp: number;
  private _initialVariables: Record<string, Encodable> | null = null;

  public readonly timeout: number;
  public readonly deviceTimeout: number;

  /** @internal */
  public consent: { timestamp?: number; active: boolean } | undefined;
  public device: Device;
  public deviceSession: Session;
  public persisted = false;
  public session: Session;
  public username: string | undefined;

  public vars: Record<string, TrackerVariable> = {};

  public get affinity() {
    return this._affinity;
  }

  public constructor(private _tracker: Tracker) {
    this.timeout = _tracker._requestHandler._sessionTimeout * 60 * 1000;
    this._cookieNames = _tracker._requestHandler._cookieNames;
  }

  public persist() {
    const timestamp = Date.now();
    const tracker = this._tracker;

    const essentialSessionData: EssentialSessionDataLayout = [
      ...this._packSessionData(timestamp, this.session, VariableScope.Session),
    ];

    const essentialDeviceData: EssentialDeviceDataLayout = [
      ...this._packDeviceData(
        timestamp,
        this.device,
        this.session,
        this.deviceSession
      ),
      this.consent ? [this.consent.timestamp, this.consent.active] : undefined,
      this.username,
    ];

    let optInSessionData: OptInSessionDataLayout | undefined = [
      packVariables(this.vars, VariableScope.Session, false),
    ];
    if (!optInSessionData[0]) {
      optInSessionData = undefined;
    }
    let optInDeviceData: OptInDeviceDataLayout | undefined = [
      packVariables(this.vars, VariableScope.Device, false),
      packVariables(this.vars, VariableScope.DeviceSession, false),
    ];
    if (!optInDeviceData[0] && !optInDeviceData[1]) {
      optInDeviceData = undefined;
    }

    tracker.cookies[this._cookieNames.essentialSession] = {
      httpOnly: true,
      sameSitePolicy: "None",
      value:
        this._purge !== Purge.None
          ? null
          : this._formatCookieValue(essentialSessionData),
    };

    tracker.cookies[this._cookieNames.optInSession] = {
      httpOnly: true,
      sameSitePolicy: "None",
      value:
        this._purge !== Purge.None
          ? null
          : this._formatCookieValue(optInSessionData),
    };

    tracker.cookies[this._cookieNames.essentialIdentifiers] = {
      httpOnly: true,
      sameSitePolicy: "None",
      maxAge: 34560000,
      value:
        this._purge === Purge.All
          ? null
          : this._formatCookieValue(essentialDeviceData),
    };

    tracker.cookies[this._cookieNames.optInIdentifiers] = {
      httpOnly: true,
      sameSitePolicy: "None",
      maxAge: 34560000,
      value:
        this._purge === Purge.All
          ? null
          : this._formatCookieValue(optInDeviceData),
    };

    const affinity = [
      timestamp,
      this._purge !== Purge.None ? undefined : essentialSessionData,
      essentialDeviceData,
      this._purge !== Purge.None ? undefined : optInSessionData,
      optInDeviceData,
    ] as AffinityDataLayout;

    this._affinity =
      this._purge === Purge.All ? undefined : tracker.env.httpEncrypt(affinity);
  }

  public purgeCookies(includeDevice = false) {
    this._purge = includeDevice ? Purge.All : Purge.Session;
  }

  public async resetSession() {
    const now = Date.now();
    this.vars = Object.fromEntries(
      Object.entries(this.vars).filter(
        ([_, value]) => value.scope !== VariableScope.Session
      )
    );
    this._unpackSession(now, now);
  }

  private _formatCookieValue<T extends Encodable>(
    data: T
  ): T extends null | undefined ? null : string {
    return any(data)
      ? `${CLIENT_STATE_DATA_VERSION}!${this._tracker.env.httpEncrypt(
          data as any
        )}`
      : (null as any);
  }

  private _packDeviceData(
    timestamp: number,
    data: Device,
    session: Session,
    deviceSession: Session
  ): DeviceDataLayout {
    return [
      ...this._packScopeData(timestamp, data, VariableScope.Device),
      data.sessions,
      data.deviceSessions,
      session.previous,
      deviceSession.previous,
      this._packSessionData(
        timestamp,
        deviceSession,
        VariableScope.DeviceSession
      ),
    ];
  }

  private _packScopeData(
    timestamp: number,
    data: ClientScope,
    variableScope: VariableScope
  ): ClientScopeDataLayout {
    return [
      timestamp,
      data.id,
      data.views,
      packVariables(this.vars, variableScope, true),
    ];
  }

  private _packSessionData(
    timestamp: number,
    data: Session,
    variableScope: VariableScope
  ): SessionDataLayout {
    return [
      ...this._packScopeData(timestamp, data, variableScope),
      data.previous,
      data.started,
      data.persisted,
    ];
  }

  private _parseCookieValue<T = any>(data: string | null | undefined) {
    if (!data) return undefined;

    let version = 0;
    const value = data.replace(/^(.*?)!/, (_, m1) => ((version = m1), ""));
    if (!version || version < CLIENT_STATE_DATA_VERSION) {
      return undefined;
    }
    return this._tracker.env.httpDecrypt<T>(value);
  }

  private async _unpackDevice(
    deviceData?: [...DeviceDataLayout, ...unknown[]]
  ): Promise<Device> {
    unpackVariables(this.vars, deviceData?.[3], VariableScope.Device, true);
    return {
      id: deviceData?.[1] ?? (await this._tracker.env.nextId("device")),
      views: deviceData?.[2] ?? 0,
      sessions: deviceData?.[4] ?? 0,
      deviceSessions: deviceData?.[5] ?? 0,
    };
  }

  private async _unpackSession(
    timestamp: number,
    lastSeen: number | undefined, // When new use the last timestamp from device data.
    sessionData?: [...SessionDataLayout, ...unknown[]],
    deviceSession = false
  ): Promise<Session> {
    const isNew = !sessionData?.[1];
    const scope = deviceSession
      ? VariableScope.DeviceSession
      : VariableScope.Session;
    unpackVariables(this.vars, sessionData?.[3], scope, true);
    return {
      id:
        sessionData?.[1] ??
        (await this._tracker.env.nextId(
          deviceSession ? "deviceSession" : "session"
        )),
      views: sessionData?.[2] ?? 0,

      isNew,
      previous: isNew ? lastSeen : sessionData?.[4],
      lastSeen,
      started: sessionData?.[5] ?? timestamp,
      persisted: !!sessionData?.[6],
      reset: async () => {
        const now = Date.now();
        this.vars = Object.fromEntries(
          Object.entries(this.vars).filter(
            ([_, value]) => value.scope !== scope
          )
        );
        this[deviceSession ? "deviceSession" : "session"] =
          await this._unpackSession(now, now);
      },
    };
  }

  private _initialized = false;
  public async initialize(clientAffinity?: Encodable | null) {
    if (this._initialized === (this._initialized = true)) {
      throw new Error("The client state has already been initialized.");
    }

    const timestamp = Date.now();
    const tracker = this._tracker;
    this.vars = {};

    if (typeof clientAffinity === "string") {
      clientAffinity = tracker.env.httpDecrypt(clientAffinity);
    }

    // [...transient, ...permanent, opIn.session, optin, optInDevice and permanent together as a fallback if the client for some reason didn't send its cookies.
    let affinity = (clientAffinity ?? []) as AffinityDataLayout;

    let essentialSession = this._parseCookieValue<EssentialSessionDataLayout>(
      tracker.cookies[this._cookieNames.essentialSession]?.value
    );

    let optInSession = this._parseCookieValue<OptInSessionDataLayout>(
      tracker.cookies[this._cookieNames.optInSession]?.value
    )?.[0] as TrackerVariableLayout | undefined;

    if (
      affinity[0] &&
      affinity[1] &&
      (!essentialSession?.[0] || affinity[0] > essentialSession[0])
    ) {
      // Session cookie is unavailable or stale.
      this._tracker.env.log({
        group: "client-state",
        source: this._tracker.requestId,
        level: "warn",
        data: [
          `Affinity is newer than cookie, using session ID ${affinity[1]?.[1]} instead of ${essentialSession?.[1]}.`,
        ],
      });
      essentialSession = affinity[1];
      optInSession = affinity[3]?.[0];
    }

    this._timestamp = essentialSession?.[0] ?? timestamp;

    let essentialDevice = this._parseCookieValue<EssentialDeviceDataLayout>(
      tracker.cookies[this._cookieNames.essentialIdentifiers]?.value
    );
    let optInDevice = this._parseCookieValue<OptInDeviceDataLayout>(
      tracker.cookies[this._cookieNames.optInIdentifiers]?.value
    );

    if (
      affinity[0] &&
      affinity[2] &&
      (!essentialDevice?.[0] || affinity[0] > essentialDevice[0])
    ) {
      // Device cookie is unavailable or stale.
      essentialDevice = affinity[2];
      optInDevice = affinity[4];
    }

    if (timestamp - this._timestamp > this.timeout) {
      // tracker.env.log({
      //   group: "client-state",
      //   source: this._tracker.requestId,
      //   level: "info",
      //   data: "new session",
      // });
      essentialSession = [] as any;
    }

    unpackVariables(this.vars, optInDevice?.[0], VariableScope.Device, false);
    this.device = await this._unpackDevice(essentialDevice);

    unpackVariables(this.vars, optInSession, VariableScope.Session, false);
    this.session = await this._unpackSession(
      timestamp,
      essentialDevice?.[0],
      essentialSession,
      false
    );

    unpackVariables(
      this.vars,
      optInDevice?.[1],
      VariableScope.DeviceSession,
      false
    );
    this.deviceSession = await this._unpackSession(
      timestamp,
      essentialDevice?.[0],
      essentialDevice?.[8],
      true
    );

    this.session.isNew && ++this.device.sessions;
    this.deviceSession.isNew && ++this.device.deviceSessions;
    const consentData = essentialDevice?.[9];
    this.consent = consentData
      ? { timestamp: consentData[0], active: consentData[1] }
      : !tracker.env.hasManagedConsents
      ? { active: true }
      : undefined;
    this.username = essentialDevice?.[10];

    this._initialVariables = clone(
      packVariables(this.vars, null, null)?.[1] ?? {}
    );

    this.persist();
  }

  public getChangedVariables(): EncodableObject {
    const changes = {};
    if (this._initialVariables) {
      const current = packVariables(this.vars, null, null)?.[1] ?? {};
      Object.entries(current).map(
        ([k, v]) =>
          !(k in changes) &&
          !equals(v, this._initialVariables![k]) &&
          (changes[k] = v)
      );
      Object.entries(this._initialVariables).map(
        ([k, value]) =>
          value !== undefined && !(k in current) && (changes[k] = undefined)
      );
    }
    return changes;
  }
}
