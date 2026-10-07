# Workshop Board

A reusable Q&A board for workshops, events and team discussions. Participants can post anonymously, vote, reply inline and explore AI-generated themes. Built with React, TypeScript, Vinext, Cloudflare Workers and D1.

This starter begins with an **empty database**. It contains no event questions, participant records, API keys or original deployment identifiers. You do not need Codex or Sites to run it. It is an independent community project, not an official OpenAI product.

## Start with Codex

**[Read START_HERE.md](START_HERE.md)** for the copy/paste Codex prompt. Fork this repo or use **Use this template**, supply your workshop name/topic and your own API key, and have Codex customise, verify, and publish your board.

For a public workshop, use **Sites in your personal workspace/account**, with its managed D1 database and explicit public access. Do not default to the OpenAI organisation or another employer workspace. See [Sites deployment](docs/DEPLOY_SITES.md). Personal ownership alone does not make a Site public.

The existing dark responsive layout, sticky composer, question cards, voting, replies, and theme view are preserved. Public settings live in [`workshop.config.json`](workshop.config.json); no source-code changes are needed for normal workshop personalisation.

## Run locally

Requires Node.js 24 or newer and npm. No Cloudflare account or API key is needed for the basic local board.

```sh
git clone https://github.com/ianho-oai/workshop-board.git
cd workshop-board
npm ci
npm run setup
npm run db:local
npm run dev
```

Open http://127.0.0.1:5173 and enter a name and organisation. The profile is remembered in that browser. SQLite data lives locally under `.wrangler/` and survives restarts.

`npm run setup` creates an ignored `.dev.vars` file with a randomly generated organiser code. It never replaces an existing file. Open `.dev.vars` to find the `ADMIN_PASSWORD` value. Enter it under **Your profile → Organiser access** to enable **Regenerate themes**. The code is not saved in browser local storage or included in client code.

## Enable AI features

Edit your local `.dev.vars`:

```dotenv
OPENAI_API_KEY="your-own-openai-api-key"
OPENAI_MODEL="a-model-available-to-your-project"
ADMIN_PASSWORD="your-generated-organiser-code"
```

Restart the dev server after changing secrets. This project uses the OpenAI **Responses API** for clustering, assignment to existing themes, and source-backed replies. Select a model available to your API project that supports background Responses, structured outputs, `reasoning.effort: low` and `web_search`. No model is preselected; set `OPENAI_MODEL` explicitly for your account. Clustering currently requests up to 60,000 output tokens, so choose a compatible model or adjust that bound. API calls are billed to the key you supply.

Without both an API key and a model, posting, voting and discussion still work. New AI jobs are not queued. Automatic resource replies are off by default: set `assistant.enabled` and trusted `assistant.searchDomains` in `workshop.config.json` to enable them. An organiser attempting clustering gets a configuration error. Enabling a key later affects new posts; it does not retroactively answer older posts.

## Features

- Persistent browser profile, with anonymous questions and replies.
- A compact sticky composer and navigation, responsive layout and pull to refresh.
- Repeated upvotes, recent/most-upvoted sorting, and a My questions filter.
- Inline expandable discussions and theme cards.
- Manual theme generation with exact question-ID validation.
- Automatic matching of new questions to existing themes.
- AI-generated replies with concise bullet points and clickable source references.
- Durable clustering jobs with three attempts, backoff, expired-lock recovery and protection against late responses overwriting newer jobs.

The board polls every 12 seconds while visible. Background Responses continue at OpenAI if a visitor closes the page; application polling, retries and publishing the finished result resume when someone visits the board. This is not a continuously scheduled worker. Each clustering attempt has a five-minute timeout and the overall run expires after twenty minutes. Existing themes remain visible during failures.

## Make it your own

Edit `workshop.config.json` for the workshop title, metadata description, organisation/team labels, topic, date locale, assistant name/focus, and trusted search domains. Run `npm run config:check` to validate it. See [customisation](docs/CUSTOMISE.md) for field details and [all guides](docs/README.md). The same domains control both web search and accepted citation links.

- `app/page.tsx`: board interface, profile dialog and inline discussions.
- `app/globals.css`: colours, typography, mobile layout and sticky elements.
- `app/api/`: session, question, reply, vote and clustering endpoints.
- `lib/clustering-job.ts`: durable clustering and retry logic.
- `lib/theme-assignment.ts`: assigning new posts to existing themes.
- `lib/agent-replies.ts`: public-resource research and automatic comments.
- `db/schema.ts` and `drizzle/`: database schema and versioned migrations.
- `tests/clustering.test.mjs`: clustering failure/recovery and organiser-code checks.

The API uses `ministry` as the organisation field name for backwards compatibility. Display labels are configurable. This repository is public and MIT licensed. Anyone can fork it or start a fresh repository with **Use this template**.

## Publish your workshop

- **Preferred:** [Sites deployment with managed D1](docs/DEPLOY_SITES.md), using your personal workspace and explicit public access.
- **Alternative:** [Direct Cloudflare Workers + D1](docs/DEPLOY_CLOUDFLARE.md), using your own account.

The board needs a dynamic Worker and D1 database; a static-only deployment cannot handle questions or votes. Each workshop gets a separate database. The template has no registered Site, deployment identifiers, or attendee data. Publishing a GitHub repository does not deploy a live board.

## Checks and contributions

```sh
npm run check
npm test
npm run build
npm run format:check
```

Tests use an in-memory SQLite database and mocked API calls; they do not spend API credits. CI runs the same type, test and build checks. To update the database schema, edit `db/schema.ts`, run `npm run db:generate`, then `npm run db:local`. Do not edit migrations that have already been applied.

Contributions are welcome through pull requests. Include a description of the change and the checks run. Keep API keys and personal event data out of fixtures.

## Privacy and operating limits

Names and organisations are self-reported, not verified identities. Anonymous posts store no public name or organisation, but a pseudonymous session still records ownership and votes. Clearing browser data creates a new participant. Repeated voting is deliberate and is not suitable for an election or one-person-one-vote survey.

All questions, named profiles attached to posts, and replies are publicly readable. Only question text and IDs are sent for clustering; the resource assistant sends question text. Background Responses use `store: true` to support recovery. Review the API's data controls for your own use case.

Only someone with the organiser code can enable clustering for their browser session. Rotating the code prevents new grants but does not revoke existing ones: revoke grants with `UPDATE participants SET can_cluster=0;` in your own database if needed. There is no full account system, moderation console or enterprise identity integration. Add those before using it where verified identity or private discussions are required.

The default board is limited to 1,000 posts and includes request rate limits. Anyone allowed to post can trigger research API usage when enabled; budget and monitor your own API project. Vinext is a beta framework, so validate upgrades before production deployment. The inherited toolchain also has npm security advisories; run `npm audit` and review/update affected dependencies before a production rollout. Passing the functional checks is not a dependency-security clearance.

## License

MIT. Bundled third-party files retain their own notices; see `THIRD_PARTY_NOTICES.md`. Names and marks do not imply endorsement.
