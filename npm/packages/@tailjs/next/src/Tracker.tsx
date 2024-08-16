"use client";

import { Tracker as ReactTracker, TrackerProperties } from "@tailjs/react";
// Required for types during build.
import "@tailjs/engine";
import Script from "next/script";
import React from "react";

export const Tracker = (props: TrackerProperties) => {
  return (
    <ReactTracker
      {...{
        ...props,
        scriptTag: (
          <Script src={process.env.NEXT_PUBLIC_TAILJS_API || "/api/tailjs"} />
        ),
      }}
    />
  );
};
