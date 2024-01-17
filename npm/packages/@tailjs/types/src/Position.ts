import { Float, Integer, Percentage } from "./native-types";

/**
 * Represents a position where the units are (CSS pixels)[#DevicePixelRatio].
 */
export interface Position {
  x: Float;
  y: Float;
}

/**
 * Represents a position where the units are percentages relative to an element or page.
 */
export interface ScreenPosition {
  xpx?: Integer;
  ypx?: Integer;
  x: Percentage;
  y: Percentage;

  /**
   * The vertical position as a multiple of the page fold position (less than 1 means that the element was visible without scrolling).
   */
  pageFolds?: Float;
}
