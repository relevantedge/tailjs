import { compileTracker } from "@tailjs/next";
import client from "./_client";
import configuration from "../../../../tailjs.client.config";

export const ConfiguredTracker = compileTracker(configuration, () => client);
