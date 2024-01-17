import type { TagMappings } from "..";
import { commandTest } from "./shared";

export type TagAttributesCommand = {
  tagAttributes: TagMappings;
};
export const isTagAttributesCommand =
  commandTest<TagAttributesCommand>("tagAttributes");
