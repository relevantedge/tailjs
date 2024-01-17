import { Rectangle } from "./Rectangle";
import { Float } from "./native-types";

export interface Viewport extends Rectangle {
  totalWidth: Float;
  totalHeight: Float;
}
