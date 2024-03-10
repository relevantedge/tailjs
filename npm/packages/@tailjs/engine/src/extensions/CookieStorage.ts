export const asfiojsadfiojasdf = 0 as any;

// import {
//   DataClassification,
//   TrackerScope,
//   TrackerVariable,
//   TrackerVariableFilter,
//   TrackerVariableSetter,
// } from "@tailjs/types";
// import {
//   MaybePromise,
//   flatMap,
//   forEach,
//   isDefined,
//   map,
//   now,
//   some,
// } from "@tailjs/util";
// import {
//   Tracker,
//   TrackerEnvironment,
//   TrackerExtension,
//   TrackerStorage,
//   VariableStorage,
// } from "..";
// import { InMemoryStore } from "./InMemoryStorage";

// type CookieValue = [
//   value: any,
//   consentLevel: number,
//   expires?: number,
//   tags?: string[]
// ];
// type CookieValueCollection = Record<string, CookieValue>;
// type SessionCookieValue = [
//   server: CookieValueCollection,
//   device: CookieValueCollection
// ];

// const mapCookieValue = (
//   scope: TrackerScope,
//   key: string,
//   value: CookieValue,
//   t0 = now()
// ): TrackerVariable => ({
//   key,
//   value: value[0],
//   scope,
//   consentLevel: value[1],
//   tags: value[3],
//   ttl: value[2] ? t0 - value[2] : undefined,
// });

// const mapTrackerVariable = (
//   variable: TrackerVariable,
//   t0 = now()
// ): CookieValue | undefined => {
//   if (variable.ttl! < 0) return undefined;
//   const expires = variable.ttl ? t0 + variable.ttl : undefined;
//   return expires || variable.tags
//     ? variable.tags
//       ? [variable.value, variable.consentLevel, expires, variable.tags]
//       : [variable.value, variable.consentLevel, expires]
//     : [variable.value, variable.consentLevel];
// };

// export class CookieStorage {
//   id = "cookies";

//   public readonly isTrackerStorage = true;

//   constructor() {}

//   apply(tracker: Tracker) {
//     //if( !)
//     const cookieNames = tracker._requestHandler._cookieNames;
//     const consentLevel = parseInt(
//       tracker.cookies[cookieNames.consentLevel]?.value!
//     );
//     if (
//       consentLevel >= DataClassification.None &&
//       consentLevel <= DataClassification.Sensitive
//     ) {
//       tracker._consentLevel = consentLevel;
//     }

//     const t0 = now();

//     forEach(
//       [cookieNames.essentialSession, cookieNames.optInSession],
//       (cookie) =>
//         forEach(
//           (tracker.env.httpDecrypt(tracker.cookies[cookie]?.value) ??
//             []) as SessionCookieValue,
//           (values, i) =>
//             this._storage.set(
//               tracker,
//               ...map(values, ([key, value]) =>
//                 mapCookieValue(
//                   i ? TrackerScope.DeviceSession : TrackerScope.Session,
//                   key,
//                   value,
//                   t0
//                 )
//               )
//             )
//         )
//     );

//     forEach([cookieNames.essentialDevice, cookieNames.optInDevice], (cookie) =>
//       this._storage.set(
//         tracker,
//         ...map(
//           (tracker.env.httpDecrypt(tracker.cookies[cookie]?.value) ??
//             {}) as CookieValueCollection,
//           ([key, value]) => mapCookieValue(TrackerScope.Device, key, value, t0)
//         )
//       )
//     );
//   }

//   public async get(): Promise<TrackerVariable | undefined> {
//     return this._storage.get(tracker, scope, key);
//   }

//   public async set(
//     tracker: Tracker,
//     ...values: TrackerVariableSetter[]
//   ): Promise<(undefined | TrackerVariable)[]> {
//     return this._storage.set(tracker, ...values);
//   }

//   public purge(tracker: Tracker, ...filters: TrackerVariableFilter[]) {
//     return this._storage.purge(tracker, ...filters);
//   }

//   public lock(tracker: Tracker, key?: string) {
//     return this._storage.lock(tracker, key);
//   }

//   public async persist(tracker: Tracker): Promise<void> {
//     const cookieNames = tracker._requestHandler._cookieNames;
//     const t0 = now();

//     // const getScopeVariables = (
//     //   scopes: TrackerScope[],
//     //   consentLevels: DataConsentLevel[]
//     // ) => {
//     //     map(
//     //       await this._storage.query(tracker, { scopes, consentLevel }),
//     //       (variable) => {
//     //         const value = mapTrackerVariable(variable, t0);
//     //         return isDefined(value) ? [variable.key, value] : undefined;
//     //       }
//     //     )

//     //   return values.length ? values : undefined;
//     // };

//     const getCookieValue = async (
//       scopes: TrackerScope[],
//       consentLevels: DataClassification[]
//     ) => {
//       let values: CookieValue[][] = [];

//       forEach(
//         await this._storage.query(tracker, { scopes, consentLevels }),
//         (variable) => {
//           const value = mapTrackerVariable(variable, t0);
//           if (isDefined(value)) {
//             (values[variable.consentLevel] ??= []).push(value);
//           }
//         }
//       );
//       values = scopes.map((scope) => values[scope]);

//       return some(values, (values) => values?.length)
//         ? tracker.httpClientEncrypt(scopes.length === 1 ? values[0] : values)
//         : undefined;
//     };

//     const essentialLevels =
//       tracker.consentLevel > DataClassification.None
//         ? [DataClassification.None, DataClassification.Indirect]
//         : [];

//     const optInLevels =
//       tracker.consentLevel > DataClassification.Indirect
//         ? tracker.consentLevel > DataClassification.Direct
//           ? [DataClassification.Direct, DataClassification.Sensitive]
//           : [DataClassification.Direct]
//         : [];

//     tracker.cookies[cookieNames.consentLevel] = {
//       httpOnly: true,
//       sameSitePolicy: "None",
//       value:
//         tracker.consentLevel === DataClassification.None
//           ? undefined
//           : "" + tracker.consentLevel,
//     };

//     tracker.cookies[cookieNames.essentialSession] = {
//       httpOnly: true,
//       sameSitePolicy: "None",
//       value: await getCookieValue(
//         [TrackerScope.Session, TrackerScope.DeviceSession],
//         essentialLevels
//       ),
//     };
//     tracker.cookies[cookieNames.optInSession] = {
//       httpOnly: true,
//       sameSitePolicy: "None",
//       value: await getCookieValue(
//         [TrackerScope.Session, TrackerScope.DeviceSession],
//         optInLevels
//       ),
//     };

//     tracker.cookies[cookieNames.essentialDevice] = {
//       httpOnly: true,
//       maxAge: Number.MAX_SAFE_INTEGER,
//       sameSitePolicy: "None",
//       value: await getCookieValue([TrackerScope.Device], essentialLevels),
//     };

//     tracker.cookies[cookieNames.optInDevice] = {
//       httpOnly: true,
//       maxAge: Number.MAX_SAFE_INTEGER,
//       sameSitePolicy: "None",
//       value: await getCookieValue([TrackerScope.Device], optInLevels),
//     };
//   }
// }
