import {
  TrackerExtensionFactory,
  commerce,
  components,
  context,
  forms,
  scroll,
  userInteraction,
} from "..";

export const defaultExtensions: TrackerExtensionFactory[] = [
  context,
  components,
  userInteraction,
  scroll,
  commerce,
  forms,
];
