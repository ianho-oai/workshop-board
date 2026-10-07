import { z } from "zod";
const category = z.object({
  label: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((s) => s.split(/\s+/).length <= 5),
  question_ids: z.array(z.string().uuid()).min(1),
});
export const clusterOutput = z.object({
  categories: z.array(category).max(12),
});
export function validateClusters(value: unknown, ids: string[]) {
  const parsed = clusterOutput.parse(value);
  const expected = new Set(ids),
    seen = new Set<string>();
  for (const c of parsed.categories) {
    for (const id of c.question_ids) {
      if (!expected.has(id) || seen.has(id))
        throw new Error("Invalid question membership");
      seen.add(id);
    }
  }
  if (seen.size !== expected.size)
    throw new Error("Incomplete question coverage");
  if (
    new Set(parsed.categories.map((c) => c.label.toLowerCase())).size !==
    parsed.categories.length
  )
    throw new Error("Duplicate labels");
  return parsed.categories;
}
