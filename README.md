# Media Planning for Claude Code

Own your media plan, flight costs and supplier follow-ups. A database and a coding agent run the planning desk, with local documents for review and no ad-platform connection required.

## Three ways to use it

- **Do it yourself:** free MIT software. Clone, install Node 20+, run npm install and npm run demo. Open the folder in Claude Code, Codex, OpenCode or Cursor. Hosting and agent subscriptions have separate costs.
- **We customise it:** Enterprise DNA maps your Bionic exports, adds your fields and commercial rules, and builds the screens and integrations your team needs on your preferred stack.
- **We run it for you:** Omni by Enterprise DNA installs, connects and operates your version. One setup fee, then a monthly retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_medium=readme&utm_campaign=bionic).

## Start with the demo

```bash
npm install
npm run demo
npm run media -- weekly-review
npm run view
npm run docs
```

The demo is fictional: Harbour Spring has an invoice variance and an unreviewed display claim; Coastal Launch has stale actuals and expired evidence. Relative dates are set at the first seed. Seed is idempotent. Use a fresh database for real work.

PGlite stores data in .data/db without a server. DATABASE_URL selects PostgreSQL. Use one process at a time with PGlite. Both modes serialize CLI mutations. Each business needs a protected database. Database-owner access is privileged, actor labels are not authenticated users, and there is no built-in sign-in or tenant separation. Public-role access is denied.

## The weekly media desk

/media-plan checks flight dates and committed cost. /pacing compares daily spend with a straight-line plan and shows freshness. /launch-check finds missing internal approval and claim reviews. /reconcile compares supplier invoices with recorded delivery. /overdue tracks follow-ups. /weekly-review combines these into Monday decisions. /compliance checks evidence and commercial controls with cited sources.

```bash
npm run media -- log-delivery --placement="Morning audio" --day=2026-10-15 --spend=250.50 --impressions=15000 --clicks=0 --evidence="Supplier daily report" --actor=Mara --dry-run
```

Use a date inside the flight and no later than today. Every mutation requires --actor and supports --dry-run. Delivery is a daily amount: logging the same placement and day replaces that day's record and records the change. It never adds a cumulative total. Invoice references are unique within a placement and duplicates fail. Approval requires a valid claim register and budget. Changing planned fields clears approval. Read docs/compliance.md for what checks mean.

Names match case-insensitively, UUID prefixes work, and ambiguous matches list candidates and fail. Every read supports --json. `npm run media -- help` lists the required flags. Unknown flags fail.

## Ten questions answered today

These questions work against your records. They are not unsupported claims that Bionic lacks equivalent reporting.

1. Which placements need attention before launch? Use `launch-check`.
2. Which campaigns are ahead of straight-line spend? Use `pacing`.
3. Which actuals are too old to trust? Use `pacing`.
4. Which supplier invoices differ from recorded delivery? Use `reconcile`.
5. Which claims lack evidence or a current review? Use `compliance`.
6. Which commitments exceed the campaign budget? Use `compliance`.
7. Who owns each overdue supplier follow-up? Use `overdue`.
8. How is spend allocated by channel and currency? Use `allocations`.
9. Which planned costs changed, and who recorded the change? Use `activity`.
10. What needs a decision at the Monday media meeting? Use `weekly-review`.

## Bring your Bionic plan

```bash
npm run media -- import bionic --campaign="Our launch" --file=imports/plan.xlsx --actor=Mara --dry-run
```

Create the campaign first, inspect the preview, then remove --dry-run. The importer reads the Bionic Media Plan Worksheet's Data Sheet, or a CSV saved from it. It keeps Line ID separate from Placement ID so flights do not collapse into one placement. Different headings need an explicit mapping. Every source row is preserved. Repeat imports are idempotent; changed planned fields clear local approval.

The import is for planned net media costs, not a whole-account restore. Grouped packages and roadblocks require separate mapping. Actuals, invoices, claims, signatures and permissions need separate entry or migration work. [Exact export steps and mapping](docs/replace-bionic.md).

## Documents and read-only views

Edit brand.json for your business name, logo and colours. `npm run docs` renders media authorization, insertion order and campaign reconciliation drafts. `npm run view` renders the week, pacing and supplier differences. /draft-authorization and /draft-order write to drafts/ and never send or book anything. /new-view adds another report; /customise changes fields and rules through a numbered migration.

Export records and events with `npm run media -- export --out=exports/archive.json`. Existing files are never overwritten. This readable archive is not a restore utility; test native backups separately. Protect generated files as carefully as the database.

## Your first hour: ten things to ask for

1. Put our name and logo on the authorization draft.
2. Create a campaign from our signed brief.
3. Preview our Bionic worksheet.
4. Compare net cost and flight counts to the source.
5. Review claims and attach real supporting evidence.
6. Record internal approval after all checks pass.
7. Enter yesterday's supplier delivery figures.
8. Investigate invoice variances.
9. Assign overdue supplier follow-ups.
10. Add our own report or approval rule.

## Scope and verification

Pacing assumes even spend across inclusive calendar days. Actuals freshness is explicit. Amounts are net media costs in the campaign currency; no tax, FX, agency fee, attribution, cross-channel reach or audience data is inferred. Bionic's buying connections, client portal and supplier directory are outside this free base. [Why no front end](docs/why-no-front-end.md). [Compliance record checks](docs/compliance.md).

`npm test` creates a temporary database and exercises every CLI command, repeat imports, malformed import rollback, changing approvals, daily actuals, invoice uniqueness, ambiguous names, dry runs, events, exports and HTML output. CI runs Node 20/22 on Windows and Linux plus PostgreSQL 17. TEST_DATABASE_URL must be an empty disposable database.

MIT. Not affiliated with Bionic or Anthropic. [Research and scores](docs/research.md).
