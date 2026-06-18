import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/session";
import { pickDrillQuestion } from "@/lib/questions";

const schema = z.object({
  domain: z.string().nullish(),
  scenario: z.string().nullish(),
  difficulty: z.string().nullish(),
});

export async function POST(req: Request) {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }

  const q = await pickDrillQuestion(user.id, body.data);
  if (!q) {
    return NextResponse.json(
      { error: "Nessuna domanda corrisponde ai filtri." },
      { status: 404 }
    );
  }
  return NextResponse.json({ question: q });
}
