import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const text = z.string().trim().min(1);
const domain = z
  .string()
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
    "Use a lowercase hostname, without https://, paths, ports, or wildcards",
  );
const schema = z
  .object({
    title: text.max(100),
    description: text.max(300),
    context: text.max(2000),
    organisationLabel: text.max(100),
    organisationPlaceholder: text.max(120),
    locale: text.refine((value) => {
      try {
        return Intl.DateTimeFormat.supportedLocalesOf(value).length > 0;
      } catch {
        return false;
      }
    }, "Use a supported locale such as en or fr"),
    assistant: z
      .object({
        enabled: z.boolean(),
        name: text.max(100),
        context: text.max(2000),
        searchDomains: z.array(domain).max(100),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      !value.assistant.enabled || value.assistant.searchDomains.length > 0,
    {
      message:
        "Choose at least one trusted search domain before enabling the assistant",
      path: ["assistant", "searchDomains"],
    },
  );
export function validateConfig(config) {
  return schema.parse(config);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    validateConfig(JSON.parse(readFileSync("workshop.config.json", "utf8")));
    console.log("Workshop configuration is valid.");
  } catch (error) {
    console.error(
      "Invalid workshop.config.json:",
      error instanceof z.ZodError
        ? error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("\n")
        : "Unable to read valid JSON.",
    );
    process.exitCode = 1;
  }
}
