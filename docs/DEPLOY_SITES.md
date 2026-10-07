# Publish a public workshop on Sites

This is the preferred agent-led deployment path. It requires a connected Sites plugin with permission to create a Site, configure secrets, and publish publicly. Use the installed plugin's current `sites-building` and `sites-hosting` skills for tool schemas, source workflow, packaging, and deployment. The steps below specify this repository's requirements; do not hardcode a developer's plugin path or credentials.

## 1. Verify the destination before registration

**Prefer the workshop owner's personal workspace/account. Do not default to the OpenAI organisation or another employer workspace.** Inspect the selected workspace through the available account UI or tools; if the identity cannot be established, ask the owner to confirm it. If an organisation workspace is active, ask the owner to switch to personal before creating resources. Do not infer the Sites workspace from the GitHub owner or API key's organisation, and do not attempt to bypass workspace policy.

Personal ownership and public access are separate. Confirm the owner's request to publish publicly (the copy/paste prompt in START_HERE includes it). If the account or policy does not support public access, report that limitation and offer the owner's personal Cloudflare account instead. A restricted link does not satisfy public publishing.

## 2. Register one Site and its database binding

Inspect `.openai/hosting.json` if it exists. For an existing deployment owned by this user, reuse its exact `project_id`. For a copied/forked personalised repository, do not deploy to someone else's ID; resolve ownership before registering a separate Site. This clean template deliberately ships without a Site ID.

Create a Site through the native Sites tool once, using the workshop title and a unique slug. Store the returned ID unchanged in `.openai/hosting.json`:

```json
{
  "project_id": "COPY_THE_EXACT_RETURNED_SITE_ID",
  "d1": "DB",
  "r2": null
}
```

The example string is a placeholder, never a deployable ID. Sites provisions and wires the real D1 resource. Keep the logical binding `DB`; do not run `wrangler d1 create` or `npm run db:remote` for a Sites-managed database. Do not copy a physical database ID, previous participant data, or secrets into this manifest. No R2 storage or workspace connectors are needed.

Keep the GitHub checkout/remotes intact. Use the Sites workflow's prepared source checkout when it needs a separate managed Git source repository. Preserve the manifest in that Site's source for future updates; the reusable upstream template must stay free of deployment IDs.

## 3. Configure production runtime values

Use Sites environment settings, with sensitive values marked as secrets:

- `OPENAI_API_KEY`: the owner's key, secret, only if AI is enabled.
- `OPENAI_MODEL`: the owner's selected compatible model ID, normal runtime variable.
- `ADMIN_PASSWORD`: a newly generated production organiser code of at least 16 characters, secret.

Obtain/save keys through a secure approved flow. Never print them or put them in source, prompts, shell arguments, or deployment archives. Local `.dev.vars` is not uploaded and does not configure production. Do not use the OpenAI employee API organisation by default. Redeployment is required after updating Sites runtime values.

## 4. Build and package the complete app

Run the required checks from AGENTS.md and review `npm audit` before production use; the inherited toolchain has outstanding advisories. The app is a dynamic Worker plus a database; **do not publish a static export**.

`npm run build` emits `dist/client` and `dist/server/index.js`. Its final packaging step detects `.openai/hosting.json` and copies the manifest and the **entire `drizzle/` directory, including `meta/_journal.json` and snapshots**, into `dist/.openai/`. Missing migration metadata can leave a seemingly successful deployment without its tables.

Use the installed Sites skill's build/source/archive workflow, passing `npm run build` as the project build where appropriate. Inspect the archive for:

- Worker entrypoint with a default `fetch` handler and client assets.
- `.openai/hosting.json` with the exact Site ID and `d1: DB`.
- `.openai/drizzle/0000_initial.sql` plus `.openai/drizzle/meta/`.
- No `.dev.vars`, `.env`, `.wrangler/`, local SQLite data, or credentials.

Sites applies packaged migrations during deployment. Preserve applied migrations; add a new migration for subsequent schema changes. Never reset a live database as a deployment fix.

## 5. Set public access, deploy, and verify

New Sites start private. For the owner's explicitly requested public workshop, use the native access tool to set `access_mode: public`, and inspect the returned access mode. Do not equate `workspace_all` or owner-private with public access. If rejected by workspace policy, stop and report the restriction; use the personal-workspace or Cloudflare path after the owner selects it.

Push the exact source using the Sites workflow, save the matching built version/archive, and deploy the saved version with the audience-appropriate operation. Follow the current Sites skill's status polling until the native result is `succeeded` with a real URL. Do not invent a URL, use a Git endpoint as a site link, or return an expected URL as if deployment had completed.

Verify the database schema with the available Sites database inspection tools. Use supported preview/QA tools for posting a synthetic question, voting, replying, and persistence. Check access metadata again and give the owner a signed-out/private-window check: the board should open without organisation membership or a platform access gate; the app's self-reported name/team form is expected. If signed-out access has not been tested, say so rather than claiming it was.

Handoff: public URL, verified workspace/account and access mode, successful deployment, database checks, AI test status, and how to update. Keep organiser codes private. Do not publish a demo instance merely because this guide exists; the user must have requested deployment.
