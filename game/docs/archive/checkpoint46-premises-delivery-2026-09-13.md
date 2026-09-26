# Checkpoint46 — shared premises and actual investment delivery

September 13, 2026. Partial implementation checkpoint, not a playable release.

The full master objective was reread. The previous turn verified that the
requested documentation cleanup was already complete; it did not advance game
implementation. This batch resumed the next source change in `feat/v3-economy`,
preserving the contributor worktree, historical archives and existing builds.

## Implemented

- `SharedPremises.investmentDelivery` recomputes room availability, costs and
  condition, then checks assigned time against actual newly prepared investment
  employees and maintained permissions. No building creates a licence or worker.
- Explicit local-network inputs now reach `InvestmentSettlement.advance` and
  `InvestmentClients.step`. Central advisers/brokers lose reserved time; their
  local desks can serve and pursue clients in more than one market. Existing
  centrally serviced accounts can remain remotely serviced.
- Existing service takes priority over new acquisitions. Local portfolio orders
  and term-note subscriptions use the same remaining qualified budget. Securities
  clearing preserves its simultaneous opening dealer cash/inventory limits.
- Site condition reduces delivered capacity without returning reserved work to
  headquarters. Owned-custody operations retain the single institution-wide
  backend budget, reduced for condition where reserved locally.
- Tests pair actual fit-out and occupancy postings with investment institutions,
  customer-funded fees, securities and note debt/claims. Internal occupancy is
  not reported as free consolidated profit.

Provisional routing decision: local adviser time can pursue its assigned market;
unreserved central acquisition time pursues the existing selected market.
Unreserved central servicing remains available to existing remote clients.
This is an explicit future-rule path, not an alteration to historical campaigns.

## Verification

All commands finished successfully:

| Command | Scope / result |
| --- | --- |
| `node tests/shared_premises.test.js` | Eight existing room/accounting groups |
| `node tests/shared_premises_delivery.test.js` | Eight new integration groups, including 24 successive local-service months, prepared education/new-hire limits, location-scoped trades, and combined real securities/note settlement |
| `node tests/investment_clients.test.js` | Ten existing groups /83 institution-client months |
| `node tests/investment_trading.test.js` | Four groups, including funded campaign actions and exact preserved9.18 comparison |
| `node tests/shared_premises_boundary.test.js` | Exact44 creation, independent AI, half-ready recovery, resolution, both owner views and rematch in Balanced, Rate, Regulatory and Growth |

The new two-location test allocates one actual adviser: ten acquisitions in
North and thirty in South instead of forty in the central target. Total work
remains200 units. At50% condition, acquisitions fall to20; below the operating
condition threshold they fall to zero, while reserved time and occupancy costs
remain real. These are funded controlled fixtures, not ordinary-start balance
acceptance or a reason to tune production probabilities.

The combined product fixture initially failed because it omitted the required
monthly investment-income settlement. The fixture was corrected to call the
existing distribution boundary, with an unfunded issuer paying no invented
income. No validator or expected legacy result was weakened. A separate inline
build invocation failed on Windows argument quoting before execution; the
corrected invocation completed and checked all script syntax.

## Exact artifact

- [Assembled development artifact](https://github.com/NerdyGeneral/BranchWars/blob/d795660/game/output/BRANCH_WARS_premises46_delivery.html)
- 184 inputs; HTML SHA-256 `5458546589c36e64c9bc89f314d7a15a9f32d2138625a5b6aeea6c1e9f73c42e`
- Engine SHA-256 `44393194fbd0004a828ac4dd0a6da32640c34d55a57e8104c7ca4d3bdb49f93d`
- [Machine-readable scope record](../../output/master-checkpoint46-verification.json)
- Source equals this generated artifact; all script blocks compile.
- Documentation check passes58 Markdown files /467 local links; whitespace
  check passes. The five frozen cleanup snapshots remain untouched.
- Normal playable HTML remains checkpoint37,
  `b4351e85160586e72a63519a1eb2fe6fecdfe9cba1c94cbdd8577231f5c78561`.

## Still required

These extensions are **not selectable in campaigns**. Source Expanded still
starts9.26. The optional pure-settlement argument is not a new saved feature.

Next: insurance routing and one ordered campaign coordinator for paid occupancy,
protected payroll/operating cash, invoice claims and subsidiary wind-down. The
existing outside-supplier-only payable handling must not receive internal rent
unmodified. Then complete versioned creation/save/view/peer/rematch handling,
office controls and whole-feature tests before enabling the new campaign rules.

No full Windows gate, current120/480 strategy matrix, browser acceptance, physical
two-computer test, final manual or release package is claimed. The source
architecture diagnostic remains the previously recorded unresolved issue.
No new reference fixture, normal-portable overwrite, publication or remote
operation occurred.
