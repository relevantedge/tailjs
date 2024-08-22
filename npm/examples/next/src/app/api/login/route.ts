import { NextResponse } from "next/server";
import { resolveTracker } from "../tailjs/route";

export const POST = async (req: Request) => {
  const user = (await req.json()).user;
  if (!user) {
    return Response.json({ error: "user expected." }, { status: 400 });
  }

  const tracker = await resolveTracker(req);
  if (!tracker) return NextResponse.json({ error: "Tracking is disabled." });

  await tracker.post([{ type: "sign_in", userId: user }]);

  return await tracker.writeTo(NextResponse.json({ ok: true }));
};
