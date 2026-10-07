# Set up your workshop with Codex

Use **Use this template → Create a new repository**, or fork this repository into your own GitHub account. Clone your copy and open that folder in Codex. Keep the MIT license and third-party notices.

Paste this into Codex (replace the bracketed values):

> Read AGENTS.md and follow START_HERE.md. Customise this board for **[workshop name]**, about **[topic]**, for **[audience]**. Keep the existing design and interactions. Help me configure my own OpenAI API key securely and choose a model available to my API project. Use **[trusted public resource domains, or no automatic answers]**. Run the checks and show me a working local board. Then follow docs/DEPLOY_SITES.md to publish it on Sites with a persistent database and public access. Use my personal workspace/account rather than the OpenAI organisation or my employer's workspace; verify the destination first.

For local setup only, omit the last two sentences. You do not need an API key to try posting, replying, or voting.

## Instructions for the coding agent

### 1. Establish the workshop settings

Read the repository and existing configuration; preserve any user edits. Ask only for missing choices that affect the workshop: name, topic/audience, organisation/team label, whether automatic resource answers are wanted, and their trusted source domains. Infer a short description and assistant name from the supplied brief. Do not require a design interview.

Edit `workshop.config.json`; see [customisation](docs/CUSTOMISE.md). Keep the layout and components. Domain names must be lowercase hostnames, without schemes, paths, or wildcards. If no trusted domains are supplied, leave `assistant.enabled` false and do not invent official sources. Theme generation still works independently when the key and model are configured.

### 2. Install and initialise locally

Use Node.js 24 or newer (see `.nvmrc`):

```sh
npm ci
npm run setup
npm run db:local
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173). `setup` creates an ignored `.dev.vars` with a random organiser code and never overwrites an existing file. Local D1 data lives in `.wrangler/`. Do not copy a previous workshop's database or seed real attendee information.

### 3. Configure the owner's AI access securely

AI is optional. Never ask the user to paste a secret into chat, commit it, print it, include it in command arguments, or put it in `workshop.config.json` or a `NEXT_PUBLIC_*` variable. Use an available secure API-key provisioning flow with the user's approval; otherwise ask the owner to edit `.dev.vars` locally or enter secrets in the hosting platform's secure settings.

Use the owner's own API organisation/project, preferably personal for an independent public workshop. Do not silently use an OpenAI employee organisation, a corporate project, or any key found elsewhere on the machine. The API project and the Sites workspace are **separate account choices**; verify both. If the user chooses manual entry, continue independent setup and report that live AI verification is pending.

Configure these server-side values:

| Value            | Purpose                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY` | The owner's API key; leave empty for a non-AI board.                                     |
| `OPENAI_MODEL`   | An explicit model ID available to that API project. No model is assumed by the template. |
| `ADMIN_PASSWORD` | The random organiser code created by setup; use a separate production code.              |

Use current official model documentation to choose a model compatible with the existing requests: Responses API, background mode, structured JSON output, `reasoning.effort: low`, and `web_search` with domain filters if automatic answers are enabled. Clustering currently allows up to 60,000 output tokens; select a compatible limit/model or adjust that bound deliberately. Do not assume a model is available because it exists in Codex or ChatGPT. See [Responses web search](https://developers.openai.com/api/docs/guides/tools-web-search) and [background mode](https://developers.openai.com/api/docs/guides/background).

Restart the local server after changing `.dev.vars`. The owner can open that file privately and use the organiser code under **Your profile → Organiser access**. Never print it in your completion message. With the owner's authorisation, verify one small live AI request; report clearly if only mock tests were run.

### 4. Verify the board

```sh
npm run check
npm test
npm run build
npm run format:check
```

Check the customised title and profile labels, create a synthetic question, vote, reply, refresh, and confirm persistence. Check both desktop and mobile layouts. If AI is enabled, check a cited resource reply and organiser-only theme generation. Do not describe mock tests as a live API test.

### 5. Publish when requested

Prefer [Sites with managed D1](docs/DEPLOY_SITES.md). Use a personal workspace and explicitly configure public access for a public workshop. If Sites cannot publish publicly in the selected workspace, ask the user to switch to their personal workspace; do not create a restricted deployment and call it public. Offer [direct Cloudflare deployment](docs/DEPLOY_CLOUDFLARE.md) when Sites is unavailable.

Return the workshop URL, verified audience, checks performed, and any unverified live AI behaviour. Explain how the owner can edit settings and redeploy. Never include secrets in the handoff.
