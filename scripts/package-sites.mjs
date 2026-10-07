import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, rm, readdir } from "node:fs/promises";

// The Cloudflare Vite plugin may copy local secrets into dist/server.
// Remove those generated copies for BOTH deployment paths before packaging.
async function removeLocalEnvFiles(directory) {
  if (!existsSync(directory)) return;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await removeLocalEnvFiles(path);
    else if (/^\.(dev\.vars|env)(\.|$)/.test(entry.name)) await rm(path);
  }
}
await removeLocalEnvFiles("dist");

// Sites consumes this metadata beside dist/client and dist/server.
// A plain Cloudflare/local build does not need a Sites identity.
const destination = "dist/.openai";
await rm(destination, { recursive: true, force: true });
if (existsSync(".openai/hosting.json")) {
  const manifest = JSON.parse(readFileSync(".openai/hosting.json", "utf8"));
  if (
    !manifest.project_id ||
    typeof manifest.project_id !== "string" ||
    manifest.d1 !== "DB"
  ) {
    throw new Error(
      "Sites requires its returned project_id and d1: DB in .openai/hosting.json.",
    );
  }
  if (
    Object.keys(manifest).some(
      (key) => !["project_id", "d1", "r2"].includes(key),
    )
  ) {
    throw new Error(
      "This board's Sites manifest must contain only project_id, d1, and optional r2. Store runtime values in Sites.",
    );
  }
  if (manifest.r2 != null) throw new Error("This board does not use R2.");
  for (const file of ["dist/server/index.js", "drizzle/meta/_journal.json"]) {
    if (!existsSync(file))
      throw new Error(`Missing required Sites build input: ${file}`);
  }
  await mkdir(destination, { recursive: true });
  await cp(".openai/hosting.json", `${destination}/hosting.json`);
  await cp("drizzle", `${destination}/drizzle`, { recursive: true });
  console.log(
    "Packaged Sites identity, DB binding, SQL migrations, and Drizzle metadata.",
  );
}
