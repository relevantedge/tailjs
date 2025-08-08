import { Falsish } from "@tailjs/util";
import { BoundaryDataTag, Float } from ".";

export type TagMap<TagType extends Tag = BoundaryDataTag> = {
  [tag: string]: TagMapEntry<TagType>;
} & { tag?: never; value?: never; score?: never; eventType?: never }; // These are reserved for tag values.

export type TagValue<TagType extends Tag = BoundaryDataTag> =
  | Falsish
  | string
  | boolean
  | Pick<TagType, keyof TagType & ("value" | "score" | "eventType")>;

export type TagMapEntry<TagType extends Tag = BoundaryDataTag> =
  | TagValue<TagType>
  | TagValue<TagType>[]
  | TagMap<TagType>;

export type ParsableTags<TagType extends Tag = BoundaryDataTag> =
  | TagMap<TagType>
  | TagType
  | Iterable<ParsableTags<TagType>>
  | string
  | string[]
  | Falsish;

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
