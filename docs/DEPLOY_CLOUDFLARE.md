# Deploy directly to Cloudflare

Use this alternative if Sites is unavailable or the owner prefers their own Cloudflare account. Use a personal account for an independent public workshop; verify the selected account before creating resources.

```sh
npx wrangler login
npx wrangler whoami
npx wrangler d1 create my-workshop-board
```

Edit `wrangler.jsonc`: choose a unique worker `name`, set `database_name` and the returned `database_id`, and set `vars.OPENAI_MODEL` to the owner's chosen compatible model. Keep the binding `DB`. The all-zero ID in the template is for local use only. Do not reuse someone else's database.

Configure production secrets interactively (never inline in command arguments):

```sh
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ADMIN_PASSWORD
```

The API key is optional for a non-AI board. Use a new random production organiser code of at least 16 characters. Then:

```sh
npm run check
npm test
npm run build
npm run format:check
npm run db:remote
npm run deploy
```

Wrangler returns the deployed URL. Verify posting, voting, replies, persistence, and access from a signed-out browser. A Cloudflare Access policy or account restriction can still prevent public access; check it explicitly. Local `.dev.vars` does not configure production.

For updates, preserve the database, append new migrations if needed, rerun the checks, apply `npm run db:remote`, then redeploy. These commands are only for direct Cloudflare hosting, not Sites-managed D1.
