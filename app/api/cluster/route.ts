import { after } from "next/server";
import { clusterQuestions, processClustering } from "@/lib/cluster";
import {
  db,
  HttpError,
  json,
  originCheck,
  participant,
  safe,
} from "@/lib/server";
export const dynamic = "force-dynamic";
export async function POST(r: Request) {
  return safe(async () => {
    originCheck(r);
    const p = await participant(r);
    const permission = await db()
      .prepare("SELECT can_cluster FROM participants WHERE id=?")
      .bind(p)
      .first<{ can_cluster: number }>();
    if (!permission?.can_cluster)
      throw new HttpError(403, "Only an organiser can regenerate themes.");
    const result = await clusterQuestions();
    after(processClustering);
    return json(result, 202);
  });
}
