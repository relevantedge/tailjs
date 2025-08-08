import { Db, MongoClient } from "mongodb";
import { MongoDbSettings } from ".";
import { withRetry } from "@tailjs/util";

export class MongoDbTarget {
  private readonly _settings: MongoDbSettings;
  constructor(settings: MongoDbSettings) {
    this._settings = settings;
  }

  protected async _execute<T>(action: (db: Db) => Promise<T>): Promise<T> {
    return await withRetry(async () => {
      var client = new MongoClient(this._settings.url);
      try {
        await client.connect();
        const db = client.db(this._settings.database);
        return await action(db);
      } finally {
        client.close();
      }
    });
  }
}
