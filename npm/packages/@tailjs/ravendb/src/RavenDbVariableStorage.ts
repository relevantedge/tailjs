import {
  TrackerEnvironment,
  VariableStorage,
  VariableStorageQuery,
} from "@tailjs/engine";
import {
  ReadOnlyVariableGetter,
  VariableGetResult,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableSetResult,
  VariableSetter,
  VariableValueSetter,
} from "@tailjs/types";
import { RavenDbTarget } from "./RavenDbTarget";

const mapDocumentId = (key: VariableKey) =>
  `variables/${key.scope}-${key.entityId}-${key.key}`;

export class RavenDbVariableStorage
  extends RavenDbTarget
  implements VariableStorage
{
  public readonly id = "ravendb-variables";

  async set(setters: VariableValueSetter[]): Promise<VariableSetResult[]> {
    const result: VariableSetResult[] = [];
    throw new Error("Method not implemented.");
    // const responses = JSON.parse(
    //   (
    //     await this._request("POST", "bulk_docs", {
    //       Commands: setters.map((setter) =>
    //         setter.value != null
    //           ? {
    //               Type: "PUT",
    //               Id: mapDocumentId(setter),
    //               ChangeVector: setter.version,
    //               Document: {
    //                 ...setter.value,
    //                 "@metadata": {
    //                   "@collection": "variables",
    //                 },
    //               },
    //             }
    //           : {
    //               Type: "DELETE",
    //               ChangeVector: setter.version,
    //               Id: mapDocumentId(setter),
    //             }
    //       ),
    //     })
    //   ).body
    // ).Results as any[];

    // const pendingGetters: VariableValueSetter[] = [];

    // for (const response of responses) {

    // }
  }

  purge(queries: VariableStorageQuery[]): Promise<number> {
    throw new Error("Method not implemented.");
  }

  refresh(queries: VariableStorageQuery[]): Promise<number> {
    throw new Error("Method not implemented.");
  }

  get(keys: ReadOnlyVariableGetter[]): Promise<VariableGetResult[]> {
    throw new Error("Method not implemented.");
  }

  query(
    queries: VariableStorageQuery[],
    options?: VariableQueryOptions
  ): Promise<VariableQueryResult> {
    throw new Error("Method not implemented.");
  }
}
// export class RavenDbVariableStorage implements VariableStorage {
//   private readonly _settings: RavenDbSettings;

//   constructor(settings: RavenDbSettings) {
//     this._settings = settings;
//   }

//   renew(
//     scope: ServerVariableScope,
//     targetIds: string[],
//     context?: VariableStorageContext
//   ): MaybePromise<void> {
//     throw new Error("Method not implemented.");
//   }
//   set<V extends VariableSetters<true>>(
//     variables: VariableSetters<true, V>,
//     context?: VariableStorageContext
//   ): MaybePromise<VariableSetResults<V>> {
//     throw new Error("Method not implemented.");
//   }
//   purge(
//     filters: VariableFilter<true>[],
//     context?: VariableStorageContext
//   ): MaybePromise<boolean> {
//     throw new Error("Method not implemented.");
//   }
//   initialize?(environment: TrackerEnvironment): MaybePromise<void> {
//     throw new Error("Method not implemented.");
//   }
//   get<K extends VariableGetters<true>>(
//     keys: VariableGetters<true, K>,
//     context?: VariableStorageContext
//   ): MaybePromise<VariableGetResults<K>> {
//     throw new Error("Method not implemented.");
//   }
//   head(
//     filters: VariableFilter<true>[],
//     options?: VariableQueryOptions<true>,
//     context?: VariableStorageContext
//   ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
//     throw new Error("Method not implemented.");
//   }
//   query(
//     filters: VariableFilter<true>[],
//     options?: VariableQueryOptions<true>,
//     context?: VariableStorageContext
//   ): MaybePromise<VariableQueryResult<Variable<any, true>>> {
//     throw new Error("Method not implemented.");
//   }
// }
