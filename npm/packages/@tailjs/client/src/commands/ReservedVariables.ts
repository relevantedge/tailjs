import type { View } from "@tailjs/types";

export type ReservedVariables = {
  view: View;
  tags: string[];
  rendered: boolean;
  consent: boolean;
  loaded: boolean;
  scripts: Record<string, "pending" | "loaded" | "failed">;
};