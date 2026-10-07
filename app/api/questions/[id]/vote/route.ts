import { z } from "zod";
import {
  db,
  HttpError,
  json,
  limit,
  participant,
  questionId,
  readBody,
  safe,
} from "@/lib/server";
export const dynamic = "force-dynamic";
export async function PUT(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return safe(async () => {
    const id = questionId((await params).id),
      p = await participant(r),
      b = z.object({ voted: z.boolean() }).parse(await readBody(r));
    await limit("vote:" + p, 120);
    const q = await db()
      .prepare("SELECT author_id FROM questions WHERE id=?")
      .bind(id)
      .first<{ author_id: string }>();
    if (!q) throw new HttpError(404, "Question not found.");
    if (q.author_id === p)
      throw new HttpError(400, "You can upvote other participants’ questions.");
    if (b.voted)
      await db()
        .prepare(
          "INSERT OR IGNORE INTO votes(question_id,participant_id) VALUES(?,?)",
        )
        .bind(id, p)
        .run();
    else
      await db()
        .prepare("DELETE FROM votes WHERE question_id=? AND participant_id=?")
        .bind(id, p)
        .run();
    return json({ ok: true, voted: b.voted });
  });
}

// Each explicit tap adds one vote; the atomic upsert also handles concurrent taps.
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return safe(async () => {
    const id = questionId((await params).id),
      p = await participant(r);
    z.object({})
      .strict()
      .parse(await readBody(r));
    await limit("vote:" + p, 120);
    const q = await db()
      .prepare("SELECT author_id FROM questions WHERE id=?")
      .bind(id)
      .first<{ author_id: string }>();
    if (!q) throw new HttpError(404, "Question not found.");
    if (q.author_id === p)
      throw new HttpError(400, "You can upvote other participants’ questions.");
    const result = await db()
      .prepare(
        "INSERT INTO votes(question_id,participant_id,count) VALUES(?,?,1) ON CONFLICT(question_id,participant_id) DO UPDATE SET count=count+1 RETURNING count",
      )
      .bind(id, p)
      .first<{ count: number }>();
    return json({ ok: true, voted: result?.count ?? 1 });
  });
}
