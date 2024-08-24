import type { TrackerProperties } from "@tailjs/react";
import type { FunctionComponent } from "react";

export type ClientConfiguration = {
  endpoint?: string;
  scriptTag?: FunctionComponent<{ src: string }>;
} & Pick<TrackerProperties, "map" | "include" | "exclude" | "stoppers">;

export const createClientConfiguration = (config: ClientConfiguration) =>
  config;
