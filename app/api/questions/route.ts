import { processClustering, recoverClustering } from "@/lib/cluster";
import {
  enqueueThemeAssignment,
  processThemeAssignments,
} from "@/lib/theme-assignment";
import { after } from "next/server";
import {
  enqueueReply,
  processAgentReplies,
  continueAgentReply,
} from "@/lib/agent-replies";
import {
  allQuestions,
  db,
  HttpError,
  json,
  limit,
  participant,
  readBody,
  safe,
  submission,
} from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(r: Request) {
  return safe(async () => {
    const p = await participant(r, false);
    await recoverClustering();
    after(async () => {
      await Promise.all([
        processAgentReplies(),
        processThemeAssignments(),
        processClustering(),
      ]);
    });
    const [questions, state] = await Promise.all([
      allQuestions(p),
      db()
        .prepare(
          "SELECT attempts,lock_until,snapshot,duration_ms,updated_at,last_checked,next_run,status,error FROM clustering WHERE id=1",
        )
        .first<{
          attempts: number;
          lock_until: number;
          snapshot: string;
          duration_ms: number | null;
          updated_at: number | null;
          last_checked: number | null;
          next_run: number;
          status: string;
          error: string | null;
        }>(),
    ]);
    return json({
      questions,
      clustering: state
        ? { ...state, snapshot: JSON.parse(state.snapshot) }
        : {
            snapshot: [],
            duration_ms: null,
            status: "waiting",
            updated_at: null,
            next_run: 0,
            error: null,
          },
    });
  });
}
export async function POST(r: Request) {
  return safe(async () => {
    const p = await participant(r);
    const b = submission.parse(await readBody(r));
    await limit("post:" + p);
    const existing = await db()
      .prepare("SELECT id,author_id FROM questions WHERE id=?")
      .bind(b.id)
      .first<{ id: string; author_id: string }>();
    if (existing) {
      if (existing.author_id !== p)
        throw new HttpError(409, "Question ID is already in use.");
      await Promise.all([
        enqueueReply(existing.id),
        enqueueThemeAssignment(existing.id),
      ]);
      await processAgentReplies(existing.id);
      after(async () => {
        await Promise.all([
          continueAgentReply(existing.id),
          processThemeAssignments(existing.id),
        ]);
      });
      return json({ id: existing.id });
    }
    await db()
      .prepare(
        "INSERT INTO questions(id,body,author_id,name,ministry,anonymous,created_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM questions)<1000",
      )
      .bind(
        b.id,
        b.body,
        p,
        b.anonymous ? null : b.name,
        b.anonymous ? null : b.ministry,
        b.anonymous ? 1 : 0,
        Date.now(),
      )
      .run();
    if (
      !(await db()
        .prepare("SELECT id FROM questions WHERE id=?")
        .bind(b.id)
        .first())
    )
      throw new HttpError(
        409,
        "This board is full. Please contact the organiser.",
      );
    await Promise.all([enqueueReply(b.id), enqueueThemeAssignment(b.id)]);
    await processAgentReplies(b.id);
    after(async () => {
      await Promise.all([
        continueAgentReply(b.id),
        processThemeAssignments(b.id),
      ]);
    });
    return json({ id: b.id }, 201);
  });
}
