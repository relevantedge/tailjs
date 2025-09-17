import { Float } from ".";

export interface Tag {
  /** The name of the tag including namespace. */
  tag: string;

  /** The value of the tag. */
  value?: string;

  /**
   * How strongly the tags relates to the target (between 0 and 1).
   * @default 1
   */
  score?: Float;
}
