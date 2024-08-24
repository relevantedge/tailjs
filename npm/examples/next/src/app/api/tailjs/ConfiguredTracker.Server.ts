import { bakeTracker } from "@tailjs/next";
import configuration from "../../../../tailjs.client.config";

import { ConfiguredClientTracker } from "./ConfiguredTracker.Client";

export const ConfiguredTracker = bakeTracker(
  configuration,
  ConfiguredClientTracker
);
