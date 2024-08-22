"use server";

import { resolveTracker } from "../api/tailjs/route";

export async function login(user: string) {
  using tracker = await resolveTracker();

  await tracker?.signIn({userId: user});

  return {success: true, sessionId: tracker?.sessionId};
}
