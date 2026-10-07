import { env } from "cloudflare:workers";
import { z } from "zod";
import { verifyAdminPassword } from "@/lib/admin";
import {
  db,
  hash,
  HttpError,
  json,
  limit,
  participant,
  readBody,
  safe,
} from "@/lib/server";
export const dynamic = "force-dynamic";
export async function POST(r: Request) {
  return safe(async () => {
    const profile = z
      .object({
        name: z.string().trim().min(1).max(100),
        ministry: z.string().trim().min(1).max(120),
        adminPassword: z.string().max(200).optional(),
      })
      .parse(await readBody(r));
    const ip = r.headers.get("cf-connecting-ip") ?? "local";
    const existing = await participant(r, false);
    let canCluster = false;
    if (profile.adminPassword) {
      await limit("admin:" + (await hash(ip)), 10, 900000);
      if (
        !(await verifyAdminPassword(profile.adminPassword, env.ADMIN_PASSWORD))
      )
        throw new HttpError(
          403,
          "The organiser code is incorrect or has not been configured.",
        );
      canCluster = true;
    } else if (existing) {
      const saved = await db()
        .prepare("SELECT can_cluster FROM participants WHERE id=?")
        .bind(existing)
        .first<{ can_cluster: number }>();
      canCluster = !!saved?.can_cluster;
    }
    if (existing) {
      await db()
        .prepare("UPDATE participants SET can_cluster=? WHERE id=?")
        .bind(canCluster ? 1 : 0, existing)
        .run();
      return json({ ok: true, canCluster });
    }
    await limit("join:" + (await hash(ip)), 150, 300000);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join("");
    await db()
      .prepare(
        "INSERT INTO participants(id,can_cluster,created_at) VALUES(?,?,?)",
      )
      .bind(await hash(token), canCluster ? 1 : 0, Date.now())
      .run();
    return json({ ok: true, canCluster }, 200, {
      "Set-Cookie": `dialogue_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${new URL(r.url).protocol === "https:" ? "; Secure" : ""}`,
    });
  });
}
