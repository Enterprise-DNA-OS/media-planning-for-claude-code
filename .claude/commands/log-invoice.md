---
description: "Collect placement, supplier reference, net amount and due date. Read existing invoices first. Duplicate references within a placement fail. Never submit or pay anything."
---

# Log Invoice

Run `npm run media -- help` to confirm flags, then `npm run media -- log-invoice --json` with the required context. Read the selected records first. Resolve ambiguous names with the listed UUIDs. For mutations, obtain the actual actor and evidence, preview with --dry-run, then apply only the operator's intended change. Never invent records, dates or approvals.



Report the result in plain language. Every amount carries its currency. Drafts stay local. Read docs/compliance.md before interpreting checks.

Collect placement, supplier reference, net amount and due date. Read existing invoices first. Duplicate references within a placement fail. Never submit or pay anything.
