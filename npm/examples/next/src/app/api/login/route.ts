import { resolveTracker } from "../tailjs/route";

export const POST = async (req: Request) => {
  const user = (await req.json()).user;
  if (!user) {
    return Response.json({ error: "user expected." }, { status: 400 });
  }

  const [tracker, response] = await resolveTracker(req);

  await tracker?.signIn({ userId: user });

  return response.json({ ok: true });
};
