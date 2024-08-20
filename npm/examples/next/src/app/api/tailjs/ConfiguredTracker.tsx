import { compileTracker } from "@tailjs/next";
import client from "./_client";
import configuration from "./config";

export const ConfiguredTracker = compileTracker(configuration, () => client);
