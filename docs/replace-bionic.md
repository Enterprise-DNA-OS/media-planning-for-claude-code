# Bring a Bionic plan across

Use the campaign-specific **Media Plan Worksheet**, downloaded from Media Plan, Add Placements, Upload, then the worksheet link. The Data Sheet contains your existing lines. The separate presentation export contains planned values too, but its layout can differ. This importer targets the worksheet, not presentation workbooks.

Source checked 15 October 2026: [Bionic worksheet instructions](https://help.bionic-ads.com/knowledge/utilize-excel-to-manage-your-media-plan). [Presentation export scope](https://help.bionic-ads.com/knowledge/present-your-media-plan) confirms that planned exports do not include actuals.

## One import command

Create a campaign once with the owner, currency, dates and budget from the client's brief. Do not use the demo database for real work.

```bash
npm run media -- add-campaign --name="Our launch" --client="Our client" --currency=NZD --budget=12000 --owner=Mara --start=2026-01-01 --end=2026-01-31 --actor=Mara
npm run media -- import bionic --campaign="Our launch" --file=imports/plan.xlsx --actor=Mara --dry-run
```

Check the preview, then remove --dry-run to import. The same command accepts a UTF-8 CSV saved from the Data Sheet. Keep the original workbook as your source archive. Save values rather than formulas. Excel dates work in XLSX, CSV dates must be YYYY-MM-DD. Costs must be plain nonnegative decimals without currency signs or thousands separators. The importer never guesses a currency; it uses the campaign currency you supplied.

## Mapping

| Worksheet heading | Local record |
|---|---|
| Line ID | Stable flight identity, scoped to this campaign |
| Placement ID | Original parent placement reference |
| Placement Name | Flight name |
| Program | Supplier/program label |
| Channel | Media channel |
| Start Date / End Date | Flight dates |
| Net Media Cost | Planned net media cost, stored as cents |
| Other columns | Retained in the original row for later mapping |

Bionic's own screenshot confirms that one Placement ID can have several Line IDs. We preserve each flight, never merge by placement name. Column labels vary with worksheet configuration. If dates, cost or channel headings differ, supply --map=imports/columns.json with keys line, placement, name, vendor, channel, start, end or cost and the exact corresponding headings. Missing required columns fail the whole import. The fixture is an authored example using these documented identity headings and our supported date/cost headings, not a customer export or a vendor-certified round trip.

## What needs separate work

Packages, roadblocks and grouped flights are rejected as a whole import, because blindly summing group headers and child costs double-counts commitments. Ask for an explicit mapping. Production costs, agency compensation, delivery fees, tax, currencies, KPI goals, assets, RFPs, signatures, actuals, invoices, permissions and Bionic's change history are not reconstructed. Extra columns remain attached to the source row. Claims and approvals start empty and must be reviewed locally.

Repeat imports use campaign plus Line ID. Identical rows change nothing. Changed rows replace planned fields and clear approval, preserving existing actuals and invoices. Lines absent from a later file remain in the database. DELETE directives fail. A malformed row rolls back every row and event in that import. Never import a different Bionic campaign into the same local campaign.

Reconcile line counts and net planned costs by currency against the workbook. Confirm every flight date and check compliance. Enter actuals as daily amounts, not running totals, and record supplier invoices separately. Run both systems until the scope you need reconciles. Switching the supported plain planning records fits one working day with a clean worksheet; buying integrations and historic reconciliation need separate scoping.

Export all records with `npm run media -- export --out=exports/archive.json`. Existing files are protected from overwrite. This is a readable archive, not a database restore. Test native backups separately.
