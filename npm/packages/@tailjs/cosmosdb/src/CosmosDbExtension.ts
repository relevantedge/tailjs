import {
  TrackedEventBatch,
  TrackerExtension,
  VariableStorageMappings,
} from "@tailjs/engine";
import { CosmosDbTarget } from "./CosmosDbTarget";
import { CosmosDbSettings } from "./CosmosDbSettings";
import { VariableServerScope } from "@tailjs/types";
import { CosmosDbVariableStorage } from "./CosmosDbVariableStorage";

export interface CosmosDbExtensionSettings extends CosmosDbSettings {
  variables?: boolean | VariableServerScope[];
}
export class CosmosDbExtension
  extends CosmosDbTarget
  implements TrackerExtension
{
  public readonly id = "cosmosdb";
  private _storageScopes?: VariableServerScope[];

  constructor({ variables = true, ...settings }: CosmosDbExtensionSettings) {
    super(settings);
    if (variables) {
      this._storageScopes =
        variables === true ? VariableServerScope.levels : variables;
      if (!this._storageScopes.length) {
        this._storageScopes = undefined;
      }
    }
  }

  patchStorageMappings(mappings: VariableStorageMappings): void {
    if (!this._storageScopes) return;

    const variableStorage = new CosmosDbVariableStorage(this._settings);
    for (const scope of this._storageScopes) {
      (mappings[scope] ??= {}).storage ??= variableStorage;
    }
  }

  async post({ events }: TrackedEventBatch): Promise<void> {
    await this._execute(async (db) => {
      const container = await this._getOrCreateContainer(db, "events", () => ({
        partitionKey: { paths: ["/session/sessionId"] },
      }));

      await container.items.bulk(
        events.map((event) => ({
          operationType: "Create",
          resourceBody: event,
        }))
      );
    });
  }
}
