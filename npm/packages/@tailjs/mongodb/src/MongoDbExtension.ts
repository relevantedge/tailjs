import { TrackedEventBatch, TrackerExtension } from "@tailjs/engine";
import { TrackedEvent } from "@tailjs/types";
import { MongoDbTarget } from "./MongoDbTarget";

export class MongoDbExtension
  extends MongoDbTarget
  implements TrackerExtension
{
  public readonly id = "mongodb";

  async post({ events }: TrackedEventBatch): Promise<void> {
    await this._execute(async (db) => {
      const collection = db.collection<TrackedEvent>("events");
      if (!(await collection.indexExists("timestamp"))) {
        await collection.createIndex({ timestamp: 1 }, { name: "timestamp" });
      }
      if (!(await collection.indexExists("session"))) {
        await collection.createIndex(
          { "session.sessionId": 1 },
          { name: "session" }
        );
      }

      await collection.insertMany(events);
    });
  }
}
