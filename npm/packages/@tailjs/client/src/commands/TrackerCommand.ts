import { TrackedEvent } from "@tailjs/types";
import type {
  TrackingBoundaryDataCommand,
  CartCommand,
  ChangeUserCommand,
  ConsentCommand,
  ExtensionCommand,
  FlushCommand,
  FormCommand,
  GetCommand,
  ListenerCommand,
  OrderCommand,
  SetCommand,
  TagAttributesCommand,
  ToggleCommand,
  UseTrackerCommand,
  ViewCommand,
  ConfigurationCommand,
} from "..";
import { Nullish } from "@tailjs/util";

export type TrackEventCommand = Omit<TrackedEvent, "id"> &
  Partial<Pick<TrackedEvent, "id">>;

export type TrackerCommand =
  | (
      | TrackEventCommand
      | TrackEventCommand[]
      | FlushCommand
      | GetCommand
      | SetCommand
      | ListenerCommand
      | ExtensionCommand
      | TagAttributesCommand
      | ToggleCommand
      | ViewCommand
      | TrackingBoundaryDataCommand
      | ChangeUserCommand
      | CartCommand
      | OrderCommand
      | FormCommand
      | ConsentCommand
      | UseTrackerCommand
      | ConfigurationCommand
    ) &
      UnlockApiCommand;

export type UnlockApiCommand = {
  key?: string | Nullish;
};
