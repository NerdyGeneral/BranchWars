# V4 rc4 — Core research programme playtest

**September 20 correction:** the frozen rc4 package has confirmed save/reload and rematch defects. The local source repair is documented in [repair status](../game/docs/rc4-local-repair.md); use the source launcher for that repair. The package and hash below still identify the original release. Balance measurements below are historical, not new acceptance results.

**Original frozen rc4 bot limitation, superseded by [rc5](v4-rc5-notes.md):** the seat-based model selector in this original package never chooses the third operating model in any branch and may delay adoption until a later investment. The stabilized rc5 source supports all 18 paid models at earned/funded tier boundaries. Research investment priorities remain unchanged; model reachability and lifecycle tests do not establish strategic balance. All economics tables below describe the original rc4 experiments.

Built from `v4.0.0-rc3` source. Core save version **8.20**, behind an explicit edition
opt-in ("Core edition" in setup). Expanded stays at **9.33** and un-opted Core stays at
**8.19**; both remain replay-pinned against their recorded reference builds and replay
exactly, so every earlier save format still loads.

Package: [releases/v4-rc4](v4-rc4/README.txt). Portable build SHA-256
`51ba02d13ad7bd8df9332b924e0be0beb20b3d972851ce7d32a0f0577b2e76d5`.

---

## 1. The finding that mattered: Core was a vault, not a bank

Measured over 12 campaigns x 120 months, rc3 Core ran:

| | rc3 | a real bank |
| --- | --- | --- |
| loan-to-deposit ratio | **3.9%** (8.4% across all arms) | 60-80% |
| cash as a share of deposits | **86%** | single digits |
| loans | $33.5M | |
| **lending's share of final score** | **1.2%** | |

The bank gathered $856M of deposits and left $784M sitting as cash.

**Cause.** `loanProductionCapacity` capped origination at `lending * 185,000 * multiplier`
— *linear in headcount* — while deposits compound. Five lending bankers cap the book near
$925K/month however large the bank grows.

This is why every lending-flavoured decision lost. `specializedCredit` originated **$59M
against `treasury`'s $33M and still lost by 9,584 points**, because originating consumes
cash, which starves branch-building, which starves deposits — and deposits plus cash were
~70% of the score.

**It is not the charge-off penalty.** That hypothesis was tested and wrong: charge-offs were
worth **-25 points** in that comparison. Score decomposition found the real answer, not
reasoning about weights.

**Fix.** Origination capacity gains a balance-sheet term: the gap to a target
loan-to-deposit ratio, closed gradually, throttled by lending headcount so a bank with no
lenders still deploys nothing. Constants were swept over 8 (target, rate) pairs x 12
campaigns, not chosen by taste.

| | rc3 | 8.20 |
| --- | --- | --- |
| loan-to-deposit | 3.9% | **72%** |
| cash / deposits | 86% | **33%** |
| lending's share of score | 1.2% | **24.5%** (owner asked for ~25%) |

---

## 2. The research system

**Six branches x three permanent operating models.** `risk` (Risk & Capital) is new;
`operations` kept expense and execution while the *capability* half of the loss and
compliance terms moved to `risk`, so each branch owns its own per-level term. Verified: the
risk lane cuts 60-month charge-offs 14% while the operations lane no longer does.

**Model economics act on 15 channels** — service capacity, deposit conversion, expense,
per-head throughput, loan volume, **loan yield**, **funding cost**, credit risk, fee income,
relationship acquisition, deposit runoff, liquidity reserve, compliance, attention, and the
tier grants. All magnitudes live in `engine/research-program.js` and nowhere else; every
accessor returns exactly 1 without the marker.

**Tier grants.** `delta()` clamps seven stats to 0-100, but that only harms a grant pushing a
stat *up*: `compliance` and `attention` are pushed *down* and their floor is the point. Only
**digital** and **acquisition** had their entire grant in a ceiling-bound stat — digital hit
100 by month 48, after which every further tier paid nothing. Both gained an unbounded
component, and grants now scale with bank size.


---

## 2b. Cross-branch combinations and product gating

Five combinations, each needing **two** branches and granting what neither gives alone, so two
banks that bought the same tree in a different order run measurably different economics:

| combination | requires | effect |
| --- | --- | --- |
| Digital Treasury | digital 2 + commercial 2 | fee income +22% |
| Branch Integration | network 2 + acquisition 2 | branch cost -22% |
| Straight-Through Processing | operations 3 + digital 2 | throughput +18% |
| Structured Credit | risk 2 + commercial 2 | loan yield +15%, losses -12% |
| Deposit Franchise | network 3 + risk 2 | runoff -28%, funding cost -10% |

All five unlock in 9 of 12 bot campaigns.

**Product gating.** Six of the nine product options now require research. The first option of
every line stays available, so no bank is ever unable to trade. A plan naming a barred product
is refused with the reason ("High-Yield Savings requires DIGITAL PLATFORM tier 1."); the bot
downgrades rather than submitting an illegal plan. `Entrepreneur` requires two branches.
Combination and gate state is projected into the owner view as `me.researchCombinations` and
`me.researchProductGates` for the UI to render.

**Cost of this change.** Teaching the bot the sixth branch took three separate accessor sites,
and the first attempt failed *silently*: `planInvestments` filtered candidates through
`STRATEGY_BRANCHES[k]`, so the bot's preference score for `risk` was computed and then
discarded -- risk sat at level 0.0 in all 12 campaigns and two combinations never unlocked.
Fixing that exposed a second bug (10 of 12 campaigns throwing `Object.keys(undefined)` on
`STRATEGY_SPECIALIZATIONS['risk']`). This codebase reads those two tables directly in more
places than a grep for iteration sites finds.

---

## 3b. Results after Phase 2, 12 campaigns per arm, 120 months

| | rc3 | pre-Phase 2 | final |
| --- | --- | --- | --- |
| arms below `idle` | 2 | none | **1** (`tiltLending`, by 370) |
| lanes below `noResearch` | 5 of 5 | 1 | **none** |
| research worth (`base - noResearch`) | ~0 | 4,637 | **7,091** |
| research vs best staffing choice | ~0% | 55% | **81%** |
| `laneDigital` | 1,918 | 2,751 | **8,451** |

Digital was never a payoff problem: efficiency alone does not win markets, which is what Core's
ending condition rewards. Combined with commercial and operations, it does.

**Regression introduced by Phase 2:** `tiltLending` fell 2,222 -> 1,365, back below `idle`
(1,735). Likely dilution -- the bot spreads research across six branches instead of five and
reaches lower levels in each, which hurts an already deposit-starved bank most. Not chased.

**On buyout endings.** 31% of Core campaigns end early by hostile buyout (Core is not a pilot,
so `evaluateStrategicEnd` defers to the base rules; the `bankRivalryVersion` fix only ever
covered Expanded). Measured with buyouts disabled, `depMargin` rises 22,075 -> 45,534 -- the
ending is *suppressing* it, not inflating it -- so removing buyouts would make balance worse.
Left alone deliberately.
---

## 3. Historical results before Phase 2 — superseded by section 3b

| | rc3 | 8.20 |
| --- | --- | --- |
| **arms scoring below `idle`** | 2 | **none** |
| lanes below `noResearch` | 5 of 5 | **1** (`laneDigital`) |
| building worth (`base - noBuild`) | +274 | **+3,475** |
| campaigns reaching the 120-month cap (`base`) | 9/12 | **12/12** |
| `tiltLending` | 243, 0W-12L | **2,369**, above `idle` |

The earlier conclusion that lending was no longer a trap was superseded by the Phase 2 regression recorded in section 3b. These two experiments must not be presented as results from one final build.

---

## 4. Not done, and known problems

- **Research is not at parity with staffing.** Lane range 6,779 against a staffing range of
  35,468. A large move from rc3, where lanes spanned 1,997-2,012 and were effectively
  identical, but not the stated target.
- **`depMargin` and `tiltBusiness` are dominant** (36,376 and 37,837). Making deposits
  deployable amplified these more than intended. This was introduced by this work and
  should be addressed before release.
- **The earlier weak-Digital result was superseded** by Phase 2. The final reported Phase 2 table has no research lane below `noResearch`, but the lending-focused arm again trails `idle`.
- **Phase 2 is implemented:** five cross-branch combinations and research product gates, including their owner-view projection and UI. The earlier statement that it had not started was stale.
- **Research UI exists, but rc4 descriptions were inaccurate.** The local source repair makes milestone/model descriptions aware of the campaign rules, including the permanent-choice confirmation. The frozen rc4 package retains the old text.

## 5. Verification

- 8 guard tests green throughout: `bank_economics`, `bank_rivalry`, `behavior-golden`,
  `runtime-stages`, `determinism`, `campaign-lifecycle`, `build`, `research_program`.
  The first two pin *current Expanded* against recorded reference builds and compare
  `chooseBot` output field by field.
- The earlier claim that the architecture failure was pre-existing was incorrect. The exact rc3 build passes its architecture test; rc4 introduces a forbidden `chooseBot` override. The local repair integrates the fallback into the existing function and passes the architecture test without raising its ceiling.
- The original six research tests passed but missed purchased-model reload and rematch rule loss, and were absent from the maintained gates. The local repair adds those lifecycle regressions, AI compatibility/product checks and economic-description checks, and registers them in both gate modes. Current completion evidence belongs in the repair status; no full-pass claim is inherited from this original release.

### Two harness defects that nearly produced false reports

Recorded because they will recur otherwise:

1. `core_lab.js` called `previewCampaignEdition` **without `currentResearch`**, so it
   measured un-opted 8.19 and reported it as the new rules — output byte-identical to the
   previous run, header still reading 8.19. It now prints the version it measured.
2. A `catch(e){}` in an ablation swallowed a temporal-dead-zone error that failed 100% of
   campaigns, and reported the resulting identical scores as a real result. Throws are now
   counted and printed.

Both are the same class as the `startingWorkforce` trap in the rc2 audit: measuring a
configuration no player can reach.
