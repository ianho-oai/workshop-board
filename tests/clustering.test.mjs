import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import Module from "node:module";
import ts from "typescript";

function loadTS(file) {
  const name = resolve(file),
    mod = new Module(name);
  mod.filename = name;
  mod.paths = Module._nodeModulePaths(dirname(name));
  const original = mod.require.bind(mod);
  mod.require = (id) =>
    id === "./cluster-validation"
      ? loadTS("lib/cluster-validation.ts")
      : id === "./board-config"
        ? loadTS("lib/board-config.ts")
        : original(id);
  mod._compile(
    ts.transpileModule(readFileSync(name, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    name,
  );
  return mod.exports;
}
const { createClusteringService } = loadTS("lib/clustering-job.ts");
const id = "af6c1de4-2fa6-56e9-a716-d5930fa68bf3";
function fixture(request, config = { key: "test-key", model: "test-model" }) {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync("drizzle")
    .filter((n) => n.endsWith(".sql"))
    .sort())
    db.exec(readFileSync("drizzle/" + name, "utf8"));
  db.exec(
    "INSERT INTO participants(id,created_at) VALUES('test-participant',1); INSERT INTO questions(id,body,author_id,anonymous,created_at) VALUES('" +
      id +
      "','How can AI help?','test-participant',1,1); INSERT INTO clustering(id,snapshot,status) VALUES(1,'[]','ready');",
  );
  let time = 2_000_000_000_000;
  const d1 = {
    prepare(query) {
      let values = [];
      return {
        bind(...v) {
          values = v;
          return this;
        },
        async first() {
          return db.prepare(query).get(...values) ?? null;
        },
        async all() {
          return { results: db.prepare(query).all(...values) };
        },
        async run() {
          return {
            meta: { changes: db.prepare(query).run(...values).changes },
          };
        },
      };
    },
  };
  const service = () =>
    createClusteringService(
      () => d1,
      () => config,
      request,
      () => time,
    );
  return {
    db,
    service,
    advance: (ms) => (time += ms),
    row: () => db.prepare("SELECT * FROM clustering").get(),
  };
}
const result = () =>
  new Response(
    JSON.stringify({
      id: "resp-test",
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                categories: [{ label: "AI value", question_ids: [id] }],
              }),
            },
          ],
        },
      ],
    }),
  );
test("manual start is idempotent and background response survives a new service instance", async () => {
  let calls = 0;
  const f = fixture(async (url, options) => {
    calls++;
    if (options.method === "POST") {
      const b = JSON.parse(options.body);
      assert.equal(b.background, true);
      assert.equal(b.model, "test-model");
      return new Response(
        JSON.stringify({ id: "resp-test", status: "queued" }),
      );
    }
    return result();
  });
  const starts = await Promise.all([f.service().start(), f.service().start()]);
  assert.deepEqual(starts.map((s) => s.status).sort(), ["queued", "running"]);
  await Promise.all([f.service().process(), f.service().process()]);
  assert.equal(calls, 1);
  assert.equal(f.row().response_id, "resp-test");
  f.advance(4000);
  await f.service().process();
  assert.equal(f.row().status, "ready");
  assert.equal(f.row().lock_until, 0);
  assert.equal(f.row().duration_ms, 4000);
  assert.equal(JSON.parse(f.row().snapshot)[0].label, "AI value");
});
test("429 respects backoff and retries successfully", async () => {
  let calls = 0;
  const f = fixture(async () =>
    ++calls === 1
      ? new Response(
          JSON.stringify({ error: { code: "rate_limit_exceeded" } }),
          { status: 429, headers: { "retry-after": "30" } },
        )
      : result(),
  );
  await f.service().start();
  await f.service().process();
  assert.equal(f.row().status, "running");
  assert.match(f.row().error, /attempt 2 of 3/);
  f.advance(29000);
  await f.service().process();
  assert.equal(calls, 1);
  f.advance(1001);
  await f.service().process();
  assert.equal(f.row().status, "ready");
  assert.equal(calls, 2);
});
test("three failed attempts preserve old themes and allow another click", async () => {
  let calls = 0;
  const f = fixture(async () => {
    calls++;
    throw new Error("network interruption");
  });
  f.db
    .prepare("UPDATE clustering SET snapshot=?")
    .run('[{"label":"Previous theme","question_ids":[]}]');
  await f.service().start();
  for (let i = 0; i < 3; i++) {
    await f.service().process();
    f.advance(60000);
  }
  assert.equal(calls, 3);
  assert.equal(f.row().status, "error");
  assert.equal(f.row().lock_until, 0);
  assert.match(f.row().snapshot, /Previous theme/);
  assert.equal((await f.service().start()).status, "queued");
});
test("auth and exhausted quota stop without repeated paid attempts", async () => {
  for (const [status, code] of [
    [401, "invalid_api_key"],
    [429, "insufficient_quota"],
  ]) {
    let calls = 0;
    const f = fixture(async () => {
      calls++;
      return new Response(JSON.stringify({ error: { code } }), { status });
    });
    await f.service().start();
    await f.service().process();
    f.advance(60000);
    await f.service().process();
    assert.equal(calls, 1);
    assert.equal(f.row().status, "error");
  }
});
test("an interrupted worker lease expires and another worker resumes the job", async () => {
  const f = fixture(async () => result());
  await f.service().start();
  f.db.exec("UPDATE clustering SET attempts=1,work_lease_until=2000000045000");
  await f.service().process();
  assert.equal(f.row().attempts, 1);
  f.advance(46000);
  await f.service().process();
  assert.equal(f.row().attempts, 2);
  assert.equal(f.row().status, "ready");
});
test("a stuck API response times out, retries and eventually unlocks", async () => {
  const f = fixture(
    async () =>
      new Response(JSON.stringify({ id: "resp-test", status: "in_progress" })),
  );
  await f.service().start();
  for (let i = 0; i < 3; i++) {
    await f.service().process();
    f.advance(301000);
    await f.service().process();
    f.advance(60000);
  }
  assert.equal(f.row().status, "error");
  assert.equal(f.row().lock_until, 0);
});
test("late completions cannot overwrite a newer run", async () => {
  let release;
  const pending = new Promise((r) => (release = r));
  let calls = 0;
  const f = fixture(async () => (++calls === 1 ? pending : result()));
  await f.service().start();
  const old = f.service().process();
  while (!release || calls === 0) await new Promise((r) => setImmediate(r));
  f.advance(21 * 60000);
  await f.service().recover();
  assert.equal(f.row().status, "error");
  await f.service().start();
  await f.service().process();
  const current = f.row();
  release(new Response(JSON.stringify({ id: "stale", status: "failed" })));
  await old;
  assert.equal(f.row().status, "ready");
  assert.equal(f.row().run_id, current.run_id);
  assert.equal(f.row().snapshot, current.snapshot);
});
test("expired running state recovers without deleting themes", async () => {
  const f = fixture(async () => result());
  f.db.exec(
    'UPDATE clustering SET status=\'running\',lock_until=123,snapshot=\'[{"label":"Saved","question_ids":[]}]\'',
  );
  await f.service().recover();
  assert.equal(f.row().status, "error");
  assert.equal(f.row().lock_until, 0);
  assert.match(f.row().snapshot, /Saved/);
});
test("organiser code is required and placeholders never grant access", async () => {
  const { verifyAdminPassword } = loadTS("lib/admin.ts");
  assert.equal(await verifyAdminPassword("Ian Ho", undefined), false);
  assert.equal(
    await verifyAdminPassword("replace-this-password", "replace-this-password"),
    false,
  );
  assert.equal(
    await verifyAdminPassword("wrong", "a-long-test-only-password"),
    false,
  );
  assert.equal(
    await verifyAdminPassword(
      "a-long-test-only-password",
      "a-long-test-only-password",
    ),
    true,
  );
});

test("missing model fails clearly without making a paid request", async () => {
  const f = fixture(
    () => {
      throw new Error("must not call API");
    },
    { key: "test-key" },
  );
  await f.service().start();
  await f.service().process();
  assert.equal(f.row().status, "error");
  assert.match(f.row().error, /OPENAI_MODEL/);
});

const { resourceReply, NO_ANSWER } = loadTS("lib/agent-result.ts");
function citedResponse(url) {
  return {
    id: "mock",
    status: "completed",
    output: [
      { type: "web_search_call", status: "completed" },
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: "- A sourced answer.",
            annotations: [{ type: "url_citation", url, title: "Resource" }],
          },
        ],
      },
    ],
  };
}
test("resource citations follow the workshop domains, including subdomains", () => {
  for (const url of [
    "https://example.org/guide",
    "https://docs.example.org/guide",
  ]) {
    const reply = resourceReply(citedResponse(url), ["example.org"]);
    assert.equal(reply.sources[0].url, url);
    assert.match(reply.body, /\[1\]/);
  }
});
test("resource citations reject unrelated hosts, lookalikes, credentials, and unsafe URLs", () => {
  for (const url of [
    "https://openai.com",
    "https://example.org.evil.com",
    "https://notexample.org",
    "http://example.org",
    "https://user:password@example.org",
    "javascript:alert(1)",
  ]) {
    assert.deepEqual(resourceReply(citedResponse(url), ["example.org"]), {
      body: NO_ANSWER,
      sources: [],
    });
  }
  assert.equal(
    resourceReply(citedResponse("https://example.org"), []).body,
    NO_ANSWER,
  );
});
