"use server";

import { resolveTracker } from "../api/tailjs/route";

export async function login(user: string) {
  const tracker = await resolveTracker();

  if (tracker) {
    await tracker.post([{ type: "sign_in", userId: user }]);

    return await tracker.json({
      success: true,
      sessionId: tracker?.sessionId,
      user: tracker?.authenticatedUserId,
    });
  }
  return { error: "Tracking is disabled." };
}
