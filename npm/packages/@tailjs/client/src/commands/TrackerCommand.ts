import { TrackedEvent } from "@tailjs/types";
import type {
  BoundaryCommand,
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
      | BoundaryCommand
      | ChangeUserCommand
      | CartCommand
      | OrderCommand
      | FormCommand
      | ConsentCommand
      | UseTrackerCommand
    ) &
      UnlockApiCommand;

export type UnlockApiCommand = {
  key?: string | Nullish;
};
