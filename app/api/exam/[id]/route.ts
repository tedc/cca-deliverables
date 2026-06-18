import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/session";
import { db } from "@/db";
import { examSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const patchSchema = z.object({
  currentIndex: z.number().int().nonnegative().optional(),
  answers: z.record(z.enum(["A", "B", "C", "D"])).optional(),
  markedForReview: z.array(z.string()).optional(),
  elapsedSeconds: z.number().int().nonnegative().optional(),
  suspend: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const [existing] = await db
    .select({ status: examSessions.status })
    .from(examSessions)
    .where(and(eq(examSessions.id, id), eq(examSessions.userId, user.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "completed" || existing.status === "expired") {
    return NextResponse.json({ error: "Session closed" }, { status: 409 });
  }

  const update: Record<string, unknown> = {};
  if (body.currentIndex !== undefined) update.currentIndex = body.currentIndex;
  if (body.answers !== undefined) update.answers = body.answers;
  if (body.markedForReview !== undefined)
    update.markedForReview = body.markedForReview;
  if (body.elapsedSeconds !== undefined)
    update.elapsedSeconds = body.elapsedSeconds;
  if (body.suspend) {
    update.status = "suspended";
    update.suspendedAt = new Date();
  } else if (body.suspend === false) {
    update.status = "in_progress";
    update.suspendedAt = null;
  }

  await db.update(examSessions).set(update).where(eq(examSessions.id, id));

  return NextResponse.json({ ok: true });
}
