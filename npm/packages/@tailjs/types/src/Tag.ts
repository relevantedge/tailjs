import { Nullish } from "@tailjs/util";
import { Float } from ".";

export type ParsableTags =
  | Tag
  | Iterable<Tag | string | Nullish>
  | string
  | string[]
  | Nullish;

export interface Tag {
  /** The name of the tag including namespace. */
  tag: string;

  /** The value of the tag. */
  value?: string;

  /**
   * How strongly the tags relates to the target.
   * @default 1
   */
  score?: Float;
}
