import { TrackedEventBatch, TrackerExtension } from "@tailjs/engine";
import { CosmosDbTarget } from "./CosmosDbTarget";

export class CosmosDbExtension
  extends CosmosDbTarget
  implements TrackerExtension
{
  public readonly id = "cosmosdb";

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
