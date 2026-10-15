# Advertising records and review checks

Checked 15 October 2026. These checks are prompts for a qualified reviewer. They do not certify an advertisement, inspect evidence contents or replace the full NZ or Australian advertising rules. The operator remains responsible for creative, targeting, regulated sectors and the final impression consumers receive.

| Rule | Implemented check | Basis |
|---|---|---|
| CLAIM_EVIDENCE | Every recorded claim needs an evidence reference, reviewer, review date and unexpired review date | NZ Commerce Commission: businesses need reasonable grounds when a claim is made and should retain supporting documentation. ACCC: advertised claims must be supportable. |
| CLAIM_REGISTER | Each placement needs at least one claim review record | Local completeness policy. If there is no objective claim, record the review conclusion and its rationale. This is not a statutory requirement to create a claim. |
| PLAN_APPROVAL | Every placement needs a named approval and reference | Local commercial control, not statutory compliance. |
| BUDGET | Planned net costs must not exceed the campaign budget | Local commercial control. No currency conversion, tax or fee inference. |
| FLIGHT_DATES | Flights fit inside the campaign dates | Local control. |

Sources: [NZ Commerce Commission, making accurate claims](https://www.comcom.govt.nz/business/dealing-with-typical-situations/making-accurate-claims/) and [ACCC, false or misleading claims](https://www.accc.gov.au/business/advertising-and-promotions/false-or-misleading-claims).

Review intervals are chosen by the operator, not invented legal periods. The command checks references and dates, not whether evidence proves a claim or existed at the original publication date. A past advertisement needs a separate historical review. Approval fails if claim checks, date checks or budget checks are open. Editing a placement or importing a changed row clears its approval. Adding a claim also clears approval. Later evidence expiry reopens the launch checks even if an approval remains recorded.

An actor is an attribution label, not verified identity. The CLI serializes its mutations and preserves events, but the database owner can bypass these controls. Use a protected database for each business and control access outside the free CLI. Row-level security denies public-role access; no application sign-in or tenant separation is included.
