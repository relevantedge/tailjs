import type { Nullish } from "@tailjs/util";
import { commandTest } from "./shared";

export interface ChangeUserCommand {
  username: string | Nullish;
}

export const isChangeUserCommand = commandTest<ChangeUserCommand>("username");
