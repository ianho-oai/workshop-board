import { after } from "next/server";
import { processAgentReplies } from "@/lib/agent-replies";
import {
  db,
  HttpError,
  json,
  limit,
  participant,
  questionId,
  readBody,
  safe,
  submission,
} from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return safe(async () => {
    const id = questionId((await params).id);
    after(() => processAgentReplies(id));
    if (
      !(await db()
        .prepare("SELECT id FROM questions WHERE id=?")
        .bind(id)
        .first())
    )
      throw new HttpError(404, "Question not found.");
    return json({
      comments: (
        await db()
          .prepare(
            "SELECT id,body,name,ministry,anonymous,is_agent,sources,created_at FROM comments WHERE question_id=? ORDER BY created_at ASC",
          )
          .bind(id)
          .all()
      ).results,
    });
  });
}
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return safe(async () => {
    const id = questionId((await params).id),
      p = await participant(r),
      b = submission.parse(await readBody(r));
    await limit("post:" + p);
    if (
      !(await db()
        .prepare("SELECT id FROM questions WHERE id=?")
        .bind(id)
        .first())
    )
      throw new HttpError(404, "Question not found.");
    const existing = await db()
      .prepare("SELECT author_id,question_id FROM comments WHERE id=?")
      .bind(b.id)
      .first<{ author_id: string; question_id: string }>();
    if (existing) {
      if (existing.author_id !== p || existing.question_id !== id)
        throw new HttpError(409, "Reply ID is already in use.");
      return json({ id: b.id });
    }
    await db()
      .prepare(
        "INSERT INTO comments(id,question_id,body,author_id,name,ministry,anonymous,created_at) VALUES(?,?,?,?,?,?,?,?)",
      )
      .bind(
        b.id,
        id,
        b.body,
        p,
        b.anonymous ? null : b.name,
        b.anonymous ? null : b.ministry,
        b.anonymous ? 1 : 0,
        Date.now(),
      )
      .run();
    return json({ id: b.id }, 201);
  });
}
