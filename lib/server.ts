import { env } from "cloudflare:workers";
import { z } from "zod";
export function db() {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}
export async function safe(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof z.ZodError)
      return json({ error: "Please check the text and required fields." }, 400);
    console.error(
      "Request failed",
      e instanceof Error ? e.message : "Unknown error",
    );
    return json(
      {
        error:
          "Something went wrong. Please try again; your draft is still here.",
      },
      503,
    );
  }
}
export async function hash(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
}
export function originCheck(r: Request) {
  const origin = r.headers.get("origin");
  if (origin && origin !== new URL(r.url).origin)
    throw new HttpError(403, "Request origin is not allowed.");
  if (r.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function readBody(r: Request) {
  originCheck(r);
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "JSON is required.");
  const s = await r.text();
  if (s.length > 12000)
    throw new HttpError(413, "This submission is too long.");
  try {
    return JSON.parse(s);
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
export async function participant(r: Request, required = true) {
  const token = r.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)dialogue_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (token) {
    const id = await hash(token);
    const row = await db()
      .prepare("SELECT id FROM participants WHERE id = ?")
      .bind(id)
      .first();
    if (row) return id;
  }
  if (required)
    throw new HttpError(401, "Please rejoin using your name and organisation.");
  return null;
}
export async function limit(key: string, max = 30, period = 60000) {
  const now = Date.now(),
    bucket = Math.floor(now / period);
  const result = await db()
    .prepare(
      "INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count",
    )
    .bind(key + ":" + bucket, now + period, max)
    .first();
  if (!result)
    throw new HttpError(429, "Please pause a moment before trying again.");
  if (Math.random() < 0.03)
    await db()
      .prepare("DELETE FROM rate_limits WHERE expires_at < ?")
      .bind(now)
      .run();
}
export const submission = z
  .object({
    id: z.string().uuid(),
    body: z.string().trim().min(3).max(2000),
    anonymous: z.boolean(),
    name: z.string().trim().min(1).max(100).optional(),
    ministry: z.string().trim().min(1).max(120).optional(),
  })
  .refine(
    (v) => v.anonymous || !!(v.name && v.ministry),
    "Name and organisation required",
  );
export function questionId(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    throw new HttpError(400, "Invalid question.");
  return id;
}
export type Question = {
  id: string;
  body: string;
  name: string | null;
  ministry: string | null;
  anonymous: number;
  created_at: number;
  votes: number;
  comments: number;
  voted: number;
  own: number;
};
export async function allQuestions(viewer: string | null) {
  return (
    await db()
      .prepare(
        `SELECT q.id,q.body,q.name,q.ministry,q.anonymous,q.created_at,(SELECT COALESCE(SUM(v.count),0) FROM votes v WHERE v.question_id=q.id) AS votes,(SELECT COUNT(*) FROM comments c WHERE c.question_id=q.id) AS comments,COALESCE((SELECT v.count FROM votes v WHERE v.question_id=q.id AND v.participant_id=?),0) AS voted,(q.author_id=?) AS own,(SELECT status FROM agent_jobs j WHERE j.question_id=q.id) AS agent_status FROM questions q ORDER BY votes DESC,q.created_at DESC`,
      )
      .bind(viewer ?? "", viewer ?? "")
      .all<Question>()
  ).results;
}
