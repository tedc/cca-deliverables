import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/session";
import { pickBruciapeloQuestion } from "@/lib/questions";

export async function POST() {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = await pickBruciapeloQuestion(user.id);
  if (!q) {
    return NextResponse.json({ error: "Pool vuoto." }, { status: 404 });
  }
  return NextResponse.json({ question: q });
}
