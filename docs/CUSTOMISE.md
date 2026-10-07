# Customise your workshop

Edit `workshop.config.json`, then run `npm run config:check`. These settings are public and compiled into the app. Restart development or rebuild and redeploy to apply changes.

| Setting                                         | Changes                                                                                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                         | Board header, profile dialog, and browser title.                                                                                          |
| `description`                                   | Browser metadata.                                                                                                                         |
| `context`                                       | Workshop topic and audience used by theme generation and the resource assistant.                                                          |
| `organisationLabel` / `organisationPlaceholder` | The profile's organisation/team field. Participants can use a team, community, or class.                                                  |
| `locale`                                        | Date formatting; the interface and theme labels remain English.                                                                           |
| `assistant.enabled`                             | Automatic replies to new posts; default false. Does not disable organiser-triggered themes.                                               |
| `assistant.name`                                | AI reply author label and pending-reply text.                                                                                             |
| `assistant.context`                             | What the resource assistant should help participants find.                                                                                |
| `assistant.searchDomains`                       | Trusted source hostnames, including their subdomains. Required when enabling automatic replies; also enforced on returned citation links. |

For example, a web accessibility workshop might use a title of `Accessible Design Lab`, a topic about inclusive web interfaces, and trusted domains `w3.org` and `developer.mozilla.org`. A team retrospective can leave automatic replies off and use AI only to group discussion themes.

Keep the original design by changing settings rather than rewriting `app/page.tsx` or `app/globals.css`. Those files own the layout, colours, cards, sticky composer, and mobile behaviour. Replace `public/favicon.svg` only if you want your own icon. The template has no organisation logo or government-specific content.

The API/database still calls the organisation field `ministry` for compatibility with inherited migrations. It accepts any organisation/team text. Do not rename it without a coordinated API and database migration.

Each workshop should have its own Site and D1 database. This is a single-workshop app, not a multi-tenant service. Renaming a board does not erase its existing questions. Do not delete a previous workshop's data without the owner's explicit request.
