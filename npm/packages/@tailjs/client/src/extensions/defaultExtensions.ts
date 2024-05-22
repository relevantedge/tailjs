import {
  TrackerExtensionFactory,
  commerce,
  components,
  context,
  forms,
  scroll,
  userInteraction,
  consent,
} from "..";

export const defaultExtensions: TrackerExtensionFactory[] = [
  context,
  components,
  userInteraction,
  scroll,
  commerce,
  forms,
  consent,
];
