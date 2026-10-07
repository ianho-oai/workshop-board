import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { validateConfig } from "../scripts/check-config.mjs";

const config = JSON.parse(readFileSync("workshop.config.json", "utf8"));
test("workshop config validates the default and a non-OpenAI workshop", () => {
  validateConfig(config);
  const custom = structuredClone(config);
  custom.title = "Accessible Design Lab";
  custom.assistant = {
    enabled: true,
    name: "Design Helper",
    context: "Find accessibility standards",
    searchDomains: ["w3.org", "developer.mozilla.org"],
  };
  assert.equal(validateConfig(custom).title, custom.title);
});
test("workshop config rejects invalid domains, locales, missing sources, and extra fields", () => {
  for (const domain of [
    "https://example.org",
    "*.example.org",
    "example.org/path",
    "EXAMPLE.ORG",
    "example.org:443",
  ]) {
    const custom = structuredClone(config);
    custom.assistant.searchDomains = [domain];
    assert.throws(() => validateConfig(custom));
  }
  assert.throws(() => validateConfig({ ...config, locale: "not_a_locale" }));
  assert.throws(() =>
    validateConfig({
      ...config,
      assistant: { ...config.assistant, enabled: true, searchDomains: [] },
    }),
  );
  assert.throws(() =>
    validateConfig({ ...config, OPENAI_API_KEY: "not-a-key" }),
  );
});
test("setup creates a key-free local file, generates a code, and never overwrites it", () => {
  const dir = mkdtempSync(join(tmpdir(), "workshop-setup-"));
  try {
    cpSync(".dev.vars.example", join(dir, ".dev.vars.example"));
    const run = () =>
      execFileSync(process.execPath, [resolve("scripts/setup.mjs")], {
        cwd: dir,
        encoding: "utf8",
      });
    run();
    const first = readFileSync(join(dir, ".dev.vars"), "utf8");
    assert.match(first, /ADMIN_PASSWORD="[a-f0-9]{48}"/);
    assert.match(first, /OPENAI_API_KEY=""/);
    assert.match(first, /OPENAI_MODEL=""/);
    assert.match(run(), /left unchanged/);
    assert.equal(readFileSync(join(dir, ".dev.vars"), "utf8"), first);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("Sites packaging includes migrations and metadata, excludes local secrets, clears stale metadata", () => {
  const dir = mkdtempSync(join(tmpdir(), "workshop-package-"));
  try {
    mkdirSync(join(dir, ".openai"));
    mkdirSync(join(dir, "dist/server"), { recursive: true });
    writeFileSync(
      join(dir, "dist/server/index.js"),
      "export default { fetch() {} };\n",
    );
    cpSync("drizzle", join(dir, "drizzle"), { recursive: true });
    writeFileSync(join(dir, ".dev.vars"), "NOT_A_REAL_SECRET=fixture\n");
    writeFileSync(
      join(dir, "dist/server/.dev.vars"),
      "NOT_A_REAL_SECRET=fixture\n",
    );
    const manifest = { project_id: "fixture-only", d1: "DB", r2: null };
    writeFileSync(join(dir, ".openai/hosting.json"), JSON.stringify(manifest));
    const run = () =>
      execFileSync(process.execPath, [resolve("scripts/package-sites.mjs")], {
        cwd: dir,
      });
    run();
    assert.deepEqual(
      JSON.parse(readFileSync(join(dir, "dist/.openai/hosting.json"))),
      manifest,
    );
    assert.ok(existsSync(join(dir, "dist/.openai/drizzle/0000_initial.sql")));
    assert.ok(existsSync(join(dir, "dist/.openai/drizzle/meta/_journal.json")));
    assert.ok(
      existsSync(join(dir, "dist/.openai/drizzle/meta/0000_snapshot.json")),
    );
    assert.ok(!existsSync(join(dir, "dist/.dev.vars")));
    assert.ok(!existsSync(join(dir, "dist/server/.dev.vars")));
    rmSync(join(dir, ".openai/hosting.json"));
    run();
    assert.ok(!existsSync(join(dir, "dist/.openai")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
