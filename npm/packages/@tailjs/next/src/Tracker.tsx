"use client";

import { Tracker as ReactTracker, TrackerProperties } from "@tailjs/react";
import Script from "next/script";
import React from "react";

export const Tracker = (props: TrackerProperties) => {
  return <ReactTracker {...{ ...props, script: <Script /> }} />;
};
