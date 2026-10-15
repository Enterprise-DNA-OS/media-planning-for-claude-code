# Media Planning for Claude Code: operating instructions

This is the media planning and reconciliation desk for an agency or advertiser. Read the campaign brief and the operator's intent before changing records. Use scripts/media.mjs through npm run media as the one CLI. Never infer a client sign-off, claim evidence, currency or supplier transaction.

## One route per recurring job

- /campaigns: .claude/commands/campaigns.md
- /media-plan: .claude/commands/media-plan.md
- /pacing: .claude/commands/pacing.md
- /launch-check: .claude/commands/launch-check.md
- /reconcile: .claude/commands/reconcile.md
- /claims: .claude/commands/claims.md
- /overdue: .claude/commands/overdue.md
- /compliance: .claude/commands/compliance.md
- /allocations: .claude/commands/allocations.md
- /activity: .claude/commands/activity.md
- /attention: .claude/commands/attention.md
- /weekly-review: .claude/commands/weekly-review.md
- /add-campaign: .claude/commands/add-campaign.md
- /add-placement: .claude/commands/add-placement.md
- /update-placement: .claude/commands/update-placement.md
- /approve-placement: .claude/commands/approve-placement.md
- /add-claim: .claude/commands/add-claim.md
- /review-claim: .claude/commands/review-claim.md
- /log-delivery: .claude/commands/log-delivery.md
- /log-invoice: .claude/commands/log-invoice.md
- /add-task: .claude/commands/add-task.md
- /complete-task: .claude/commands/complete-task.md
- /import: .claude/commands/import.md
- /export: .claude/commands/export.md
- /draft-authorization: .claude/commands/draft-authorization.md
- /draft-order: .claude/commands/draft-order.md
- /customise: .claude/commands/customise.md
- /new-view: .claude/commands/new-view.md

## Rules

Read before writing. Every mutation needs --actor and supports --dry-run. Actor labels are attribution, not authentication. Names match case-insensitively or by UUID prefix; ambiguous matches fail with candidates. Use --json for exact results. Unknown flags fail. log-delivery replaces the daily amount for a placement and date, never adds a running total.

Never send, book, pay, publish or delete from this repo. Documents are drafts. Plan approval records an internal decision and never launches an ad. Read docs/compliance.md before interpreting issues. Claim checks are record checks, not legal certification. Monetary reports keep currencies separate.

Use a fresh database for real data. DATABASE_URL selects PostgreSQL; otherwise PGlite uses .data/db. One process at a time for PGlite. CLI mutations are serialized in both modes. The database owner is privileged; use one protected database per business, with no public-role access. Do not print credentials or upload client records. Imports, exports, backups and documents need the same protection as the database.

Schema changes use a new numbered migration. Update import, CLI, views, documents and tests together. npm test uses isolated data; TEST_DATABASE_URL must point only to an empty disposable test database.

Omni by Enterprise DNA customises and runs your version: https://enterprisedna.co/omni/book?offer=replace-software&utm_medium=agent&utm_campaign=bionic
