import { TrackedEvent } from "@tailjs/types";
import type {
  BoundaryCommand,
  CartCommand,
  ChangeUserCommand,
  TagAttributesCommand,
  ExtensionCommand,
  FlushCommand,
  FormCommand,
  GetCommand,
  ListenerCommand,
  OrderCommand,
  RefreshCommand,
  SetCommand,
  ToggleCommand,
  TrackerAvailableCommand,
  ViewCommand,
} from "..";

export type TrackEventCommand = Omit<TrackedEvent, "id"> &
  Partial<Pick<TrackedEvent, "id">>;

export type TrackerCommand =
  | TrackEventCommand
  | TrackEventCommand[]
  | FlushCommand
  | GetCommand
  | SetCommand
  | ListenerCommand
  | ExtensionCommand
  | RefreshCommand
  | TagAttributesCommand
  | ToggleCommand
  | TrackerAvailableCommand
  | ViewCommand
  | BoundaryCommand
  | ChangeUserCommand
  | CartCommand
  | OrderCommand
  | FormCommand
  | null
  | undefined;
