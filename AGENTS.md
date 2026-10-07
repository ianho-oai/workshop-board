# Workshop Board

A reusable workshop Q&A board. Preserve the existing responsive dark design, sticky composer, question cards, voting, inline replies, and theme view when personalising it.

- Start with [START_HERE.md](START_HERE.md) when asked to set up or customise a workshop. The [guide index](docs/README.md) links deployment and operating details.
- Put public workshop settings in `workshop.config.json`. Never put API keys, organiser codes, participant data, or deployment credentials there or in tracked files.
- Keep the app usable without AI. Use the workshop owner's own API project/key and an explicitly selected supported model; never borrow a developer's or employer's credentials.
- For public Sites deployment, prefer the owner's **personal workspace/account, not the OpenAI organisation or another employer workspace**. Verify the selected account before creating resources. Personal ownership does not automatically mean public access. Follow [Sites deployment](docs/DEPLOY_SITES.md), explicitly set public access when requested, and verify the returned access mode and successful deployment.
- Do not deploy to an existing Site ID or database owned by someone else. Do not replace this repository's Git remote with a Sites remote; use the Sites workflow's prepared checkout.
- Preserve the logical database binding `DB`. Keep existing migrations immutable; add migrations for schema changes. `ministry` is a legacy internal field for organisation/team, not a government-specific requirement.
- Required checks for application changes: `npm run check`, `npm test`, `npm run build`, `npm run format:check`. Tests must use synthetic data and mocked AI calls. Confirm before spending API credits if the user has not authorised a live check.
- Inspect Git status and diffs, preserve unrelated changes, and only push, publish, or change access within the user's request. Setup instructions alone do not authorise deployment.
