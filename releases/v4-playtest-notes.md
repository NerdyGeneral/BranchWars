# V4 Expanded playtest — v4.0.0-rc3

September 14, 2026 (local). Corrected checkpoint68b. This is a **playtest, not a
finished or balance-certified release**. V4 lives on `release/v4-playtest`; main,
V2/V3 and the rc1/rc2 tags remain preserved. The old `releases/v4` directory is an
rc2 compatibility reference; current unpacked files are in `releases/v4-rc3`.

## Changes since rc2

- People owns bank staff allocation and coverage. Customers owns household and
  commercial relationships, offers and applications. Products owns the catalogue,
  pricing/policies, advertising and statements. Markets retains contextual local
  building, conversion and staffing. These use the same shared draft, not copies.
- The monthly review exposes required decisions and staffing warnings, with links
  to the relevant controls. Product-pricing and client shortcuts open the actual
  editor. Core retains its simpler layout. New-human starting-work choices are
  explicit, and AI planning receives guarded reserve and recovery-cost repairs.
- New Expanded campaigns use 9.33 with `bankRivalryVersion:1`: market dominance and
  score advantages no longer produce automatic bank-control endings. Receivership
  and funding-covenant resolution remain real failures. Company acquisitions remain
  funded transactions, not free bank assets. Existing campaigns/rematches keep
  their rules; no save is upgraded automatically and no new checkbox is added.
- Corrected terminal validation now accepts a real funding-covenant failure,
  including its saved game, owner views and rematch. **Do not use the earlier local
  package named `BranchWars-V4-stabilization68-20260914`; use 68b or this rc3 ZIP.**

No new yield, payroll, reserve, growth-quota or subsidy tuning was included in
checkpoint68. National Empire and insurance underwriting remain deferred.

## Exact identity and verification

- Portable SHA256: `a3c293cfe58ac21f97df256fe28bc06e35f14f14518015d2fd2cd26479052ccf`.
- Engine SHA256: `6844c61c3457ca938c59030c8177614ddacef99afb20eeddcdfa7bb2a4812b33`.
- ZIP SHA256: `c9850733604cbecf5a6167884f53501186b92976d9760c7d81841463692a032c`.
- 202 source inputs; new Core 8.19 / Expanded 9.33. The ZIP is byte-identical to the
  handed-over 68b ZIP and contains only six runtime files, no credentials or saves.
- Targeted ending tests preserve old 9.32 creation, plans, settlement, RNG and
  private views; reproduce the old premature auction; and verify new failure,
  strict-version, half-ready recovery and rematch behavior.
- Corrected-build GitHub-room, LAN and direct-link simulations pass old-peer
  refusal, two completed months, reconnect/checkpoint recovery, delayed messages
  and owner-private information checks. These are not physical two-computer tests.
- Browser sampling used the identical UI before the terminal-validation-only
  correction: 1280×720 and 760×800 had no document horizontal overflow. People and
  selected-product Pricing had no visible native dropdowns; bank policies had two.
  Normal new-game resolution/reload/Continue also worked. This is not every control
  or a claim that the whole game has no dropdowns.

The [package verification](v4-verification.json) identifies the extracted runtime
checks and 13 successful commands on a separately extracted Git index, without
untracked local diagnostics. This verifies source completeness, not the full
game. The complete Windows run beginning 00:35:45 UTC on September 15 is **still
pending at publication preparation**. Its inputs are frozen; earlier repaired
tests and the interrupted 23:50 run are not a clean full-gate pass. See the
[current release status](../game/docs/release-status.md) for later outcomes.

## Balance findings and limits

| Recorded policy | Actual months | Result |
| --- | ---: | --- |
| Commercial under new rivalry | 120 | No ending; both banks profitable in the final month |
| Cautious mixed bank, no new planned expansion | 120 | Survived; loan book roughly its original $9.5M |
| Prior lending/expansion policy | 23 | Receivership |
| Controlled staffing with paid expansion | 32 | Receivership |

The commercial trial's first 82 months match the prior prematurely ended bank
snapshots exactly. Its rival's loan book still contracts sharply. The cautious
bank depends heavily on commercial-service income; it does not prove pure-lending
profitability. The lending comparison deliberately retains 9.32. These recorded
trials used the pre-terminal-fix engine; their saved endpoints restore exactly on
the corrected engine, but that is not another 120-month simulation. The earlier
Rate Shock comparison covers only 24 months. Upfront affordability is not payback.

Remaining acceptance: conventional lending/expansion economics, mature-turn
performance, broader comeback/long-run strategy quality, complete UI/playability
review and a real two-computer session. Deposit dominance alone is not a bug.

Read the [updated quick-start](branch-wars-v4-guide.md) and
[player guide](../game/docs/player-guide.md). The V3 PDF stays with its frozen
release; a comprehensive V4 PDF is not part of this update.
