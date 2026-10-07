import { boardConfig } from "./board-config";
export const NO_ANSWER =
  "I looked for relevant public resources online but couldn’t find a reliable answer to this. I’ll leave it to the workshop organisers to respond!";
export const SEARCH_FAILED =
  "I couldn’t complete the online resource search just now. I’ll leave this to the workshop organisers to respond.";
type Annotation = {
  type: string;
  url?: string;
  title?: string;
  start_index?: number;
  end_index?: number;
};
export type AIResponse = {
  id: string;
  status: string;
  output?: Array<{
    type: string;
    status?: string;
    content?: Array<{
      type: string;
      text?: string;
      annotations?: Annotation[];
    }>;
  }>;
};
export function resourceReply(
  data: AIResponse,
  allowedDomains: string[] = boardConfig.assistant.searchDomains,
) {
  const messages =
    data.output
      ?.filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text") ?? [];
  const sources: Array<{ url: string; title: string }> = [],
    sourceIndex = new Map<string, number>();
  const validSource = (a: Annotation) => {
    if (a.type !== "url_citation" || !a.url) return null;
    try {
      const u = new URL(a.url);
      if (
        u.protocol !== "https:" ||
        u.username !== "" ||
        u.password !== "" ||
        !allowedDomains.some(
          (domain) =>
            u.hostname === domain || u.hostname.endsWith("." + domain),
        )
      )
        return null;
      if (!sourceIndex.has(u.href)) {
        sources.push({
          url: u.href,
          title: (a.title || u.hostname).slice(0, 180),
        });
        sourceIndex.set(u.href, sources.length);
      }
      return sourceIndex.get(u.href)!;
    } catch {
      return null;
    }
  };
  const paragraphs = messages.map((m) => {
    const ranges = new Map<
      string,
      { start: number; end: number; indices: number[] }
    >();
    for (const a of m.annotations ?? []) {
      const index = validSource(a);
      if (!index || a.start_index === undefined || a.end_index === undefined)
        continue;
      const key = `${a.start_index}:${a.end_index}`;
      const range = ranges.get(key) ?? {
        start: a.start_index,
        end: a.end_index,
        indices: [],
      };
      range.indices.push(index);
      ranges.set(key, range);
    }
    let chars = Array.from(m.text ?? "");
    for (const r of [...ranges.values()].sort((a, b) => b.start - a.start)) {
      if (r.start >= 0 && r.end <= chars.length && r.end >= r.start)
        chars.splice(
          r.start,
          r.end - r.start,
          ...Array.from(r.indices.map((i) => `[${i}]`).join("")),
        );
    }
    return chars.join("");
  });
  let body = paragraphs.join("\n");
  const searched = data.output?.some(
    (o) => o.type === "web_search_call" && o.status === "completed",
  );
  if (!searched) return { body: SEARCH_FAILED, sources: [] };
  if (!body.trim() || body.includes("NO_RELEVANT_RESOURCES") || !sources.length)
    return { body: NO_ANSWER, sources: [] };
  body = body
    .replace(/cite[^]*/g, "")
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
  if (!/\[\d+\]/.test(body))
    body += " " + sources.map((_, i) => `[${i + 1}]`).join("");
  return { body: body.slice(0, 2000), sources };
}
