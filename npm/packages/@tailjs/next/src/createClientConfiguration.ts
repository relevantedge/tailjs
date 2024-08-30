import type { TrackerProperties } from "@tailjs/react";

export type ClientConfiguration = {
  tracker: Pick<
    TrackerProperties,
    "map" | "include" | "exclude" | "stoppers" | "endpoint" | "scriptTag"
  >;
};

export const createClientConfiguration = (config: ClientConfiguration) =>
  config;
