"use client";
import { bakeTracker } from "@tailjs/next";
import configuration from "../../../../tailjs.client.config";

export const ConfiguredClientTracker = bakeTracker(configuration);
