import type { BoundaryDataMapper } from "@tailjs/react";
import type { FunctionComponent } from "react";

export type ClientConfiguration = {
  map?: BoundaryDataMapper;
  endpoint?: string;
  scriptTag?: FunctionComponent<{ src: string }>;
};

export const createClientConfiguration = (config: ClientConfiguration) =>
  config;
