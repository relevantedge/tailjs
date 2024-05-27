import type { UserAgentEvent } from "@tailjs/types";
import { window } from "../lib";

export const detectDeviceType = (): Pick<
  UserAgentEvent,
  "deviceType" | "screen"
> => {
  // Common thresholds based on https://yesviz.com/viewport/
  const screen = window?.screen;
  if (!screen) return {};

  let { width: w, height: h, orientation: o } = screen; // Get's the resolution in logical (CSS) pixels.
  const landscape = w < h;
  const angle = o?.angle ?? window["orientation"] ?? 0;
  (angle === -90 || angle === 90) && ([w, h] = [h, w]);

  return {
    deviceType: w < 480 ? "mobile" : w <= 1024 ? "tablet" : "desktop",
    screen: { dpr: window.devicePixelRatio, width: w, height: h, landscape },
  };
};
