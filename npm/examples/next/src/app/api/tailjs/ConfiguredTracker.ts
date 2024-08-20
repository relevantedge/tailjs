import configuration from "./config";
import client from "./_client";
import { compileTracker } from "@tailjs/next";

export const ConfiguredTracker = compileTracker(configuration, () => client);
