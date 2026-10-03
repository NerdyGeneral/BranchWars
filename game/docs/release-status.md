# Release status and known issues

## October 3 — Core 10.1 multiplayer candidate

The [approved plan](core-multiplayer-plan.md) is implemented as **Core · larger
map & 2–4 banks** on the start screen. Continental has 24 fictional markets and
four equal founding hubs; National retains 12 markets. Human and AI banks share
simultaneous monthly settlement, targeted rivalry, private financial reports,
local handoffs and strict saved continuation. Historical campaigns keep their
existing rules.

[Online rooms](online-multiplayer.md) use a dependency-free Node server with
private seat credentials, readiness, reconnect keys and optional durable storage.
Disconnected humans keep their seats. The host is trusted with full campaign
backups, including every bank's private books and orders. Legacy LAN, Direct P2P
and Repository Link retain their two-bank protocols.

Verification includes 480 new-engine simulated months, 192 additional exact
month-end imports, targeted acquisition and elimination cases, private views,
real HTTP concurrency/replay/restart tests, and desktop/mobile browser workflows.
Historical golden expectations passed unchanged: 20 campaigns and 790 turns.
Eighteen adjacent historical suites and the existing interface regressions also
passed. The [verification receipt](../reports/qa/core-multiplayer-2026-10-03.json)
records the build and the scope of these checks.

The [draft candidate PR #34](https://github.com/NerdyGeneral/BranchWars/pull/34)
also includes a tested persistent container and Render Blueprint. The complete
release-balance command passed 16 campaigns and 1,920 months. Broader regressions
found two stale review tests; the help check now exercises behavior, and the
engine digest was reviewed against fresh independent historical replays without
changing golden expectations.

Connection acceptance additionally found and fixed lost initial Create/Join
responses, unavailable session-storage fallback and controls becoming stale after
an unchanged poll. The corrected client passes 22 portable UI tests and a real
four-browser session with deliberately dropped replies, page reloads, idle polls,
a simultaneous turn and host reconnection. The current container also survives
forced recreation with the exact private campaign intact.

Public HTTPS deployment, the [separate-location playtest](core-online-playtest.md),
human balance testing and complete standard/Windows release gates remain
outstanding. No public service, merge or release was published.

## September 28 — Planning repairs on PR #33

Core and Expanded planning repairs are implemented and scoped-tested; see the
[repair evidence](archive/planning-repairs-2026-09-28.md) and
[exact-build browser receipt](../reports/qa/planning-repair-2026-09-28.json).
Portable SHA256: `4ea09486aa3eb1e8318fa32b3a182b5830fffb3725dad863969cc13509a150be`.
This UI batch preserves the engine from the preceding Core balance/hiring change.
Full GitHub checks on the updated PR head remain required before merge.

## September 28 — Interface follow-up: header figures, one Research page, Core products

Three playtest requests. Interface only; no campaign rules change.

- **Expanded header.** Deposits and loans now sit beside Available to spend, in compact
  millions with the exact amount on hover.
- **Strategy → Research is one page.** From 9.37, the Research tab showed only the five
  digital and commercial projects. The capability tracks were reachable only through
  Operating models, and the project families switched with buttons inside the detail
  panel. One grouped list now holds capability research, then the digital and commercial
  projects, and combined capabilities where they exist. Each entry shows milestones, paid
  progress, or the prerequisite it still needs. A capability track links to its operating
  model, and Operating models links back to the same track. Links that name a track or a
  project, from Banking, Review or older desks, open it directly.
- **Core Operations.** Product & balance-sheet design and Bank funding & capital policies
  sit side by side again, in balanced proportion. Each policy shows its three options in one
  row, so less scrolling separates Decision & staff from Products, pricing & risk. They
  stack below 1,100 px.

## September 28 — Expanded 9.40: bank-issued cards

New Expanded campaigns choose who issues their credit cards at launch: Cedar Reserve as
partner (the unchanged 9.39 contract) or the bank itself. A bank-issued program costs a
$15,000 platform, $300 a month and $4 per account. The bank pays merchants from protected
cash, carries the balances as receivables net of their loss allowance, keeps 2.2% of
purchases and all interest, and bears provisions, disputes and charge-offs. Launch and new
accounts need a 10% capital ratio. See [bank-issued cards](bank-cards.md).

- **Compatibility.** `bankCardsVersion: 1` stamps 9.40 and needs a peer that supports it.
  Core, 9.39 and older campaigns and their rematches keep their rules. Seeded 9.38 and 9.39
  partner-card campaigns replay byte-identically on the 9.40 engine for 16 months,
  including wind-down.
- **Balance.** On the 36-month card-only comparison, a full bank-issued book earns about
  2.8 times the partner share (+$27,750 against +$9,786 over the last year) and repays its
  platform in month 30 with faster growth; a cautious bank-issued book does not repay it.
- **Checks.** New `bank_cards` test (9 checks, source and portable). 37 scoped suites pass,
  including partner cards, card economics, corporate income, behavior goldens, determinism
  and the interface suites. Cards were checked in headless Chromium before launch and after
  seven months on the bank route.
- **Fixed: card programs below the capital reserve.** Since 9.38, once a bank's spending
  limit could not cover its card program's running cost, every plan except a permanent
  wind-down failed the capital reserve check, for a human as well as the AI; in AI mode the
  human's month could not resolve. The running cost is no longer a commitment then (the
  program pauses at settlement, as it always did) and the AI does not stage a launch it
  cannot pay for. Campaigns that could continue before replay identically. See
  [bank-issued cards](bank-cards.md#card-programs-below-the-capital-reserve-fixed).

## September 28 — Playtest follow-up: Core Operations layout, forecast drivers, logos

Three requests from the 9.39 playtest. No campaign rule changes: saves of every version keep
their economics, and the same seeded 8.20 Core, 9.34 and 9.39 Expanded campaigns replay
identically before and after.

- **Core Operations layout.** The two desk tabs split the row equally, every desk opens with
  the same titled section, paired cards share a row's width and height, and deposit pricing,
  lending standards and capital strategy sit in three even columns. The sticky destination
  bar sits flush at the top, so scrolled content no longer shows through above it.
- **Forecast & books → Growth & limits.** Which limit holds deposits and loans back this
  month (bankers and branches, market room, office capacity, lending staff or spare cash);
  the monthly effect of each project under way or staged once complete; and what each
  research branch and operating model adds, such as a treasury model's fee income. Every
  figure is the ordinary forecast on private copies; see `engine/forecast-drivers.js`.
  A project that cannot be completed privately, currently staged offices in 9.35+ Expanded,
  is reported as not estimated rather than guessed.
- **Bank logos.** Uploads accept JPG, PNG, WebP or GIF up to 10 MB, scaled to fit and
  re-encoded as JPEG. Stored logos may be up to 400 × 400 pixels and 150 KB (were 200 × 200
  and 100 KB); most store at a few tens of KB. SVG is still refused.

### Recruitment forecast follow-up

Core and Expanded Forecast & books now includes **Hiring impact**. The ordinary
bank forecast covers this month's operating stage, before new hires arrive, so
staging recruits cannot change its deposit or loan growth. The new table holds
today's book and economy fixed, then assigns all arriving recruits to Retail &
service, Business, Lending, or Operations one role at a time. It displays the
estimated monthly deposit and loan growth, operating profit, recurring expense,
the change from the current draft, and the binding deposit/loan limits. With no
staged recruits it compares one illustrative generalist. Recruits enter Retail
& service by default and can be reassigned in the following month's plan.
The what-if does not forecast next month's economy or settled balances, and it
does not include the one-time signing cost in operating profit.

## September 27 — 9.39 repository publication

[PR #27](https://github.com/NerdyGeneral/BranchWars/pull/27) publishes the current
9.39 game and source from the PR #26 baseline. The playable HTML is byte-identical
to the tested local candidate. A [sanitized validation receipt](../reports/verification/expanded-9.39-local-validation.json)
records the prior local checks; GitHub CI is a separate run and the PR remains
subject to its checks and review. Earlier entries below record local milestone
status at the time of completion. Raw local evidence, campaign snapshots and
browser captures are deliberately not distributed; local-only paths are labeled
as such. This repository update does not create a GitHub Release or establish
full-release balance or physical multiplayer acceptance.

## September 27 — Partner-card balance pass (local 9.39 candidate)

New Expanded campaigns use a $2,500 license, $100 monthly platform cost, $3
per live account, a $0–$1,000 acquisition budget in $100 steps, and smaller
shared oversight workloads for the outsourced program. Cards → Results now
explains operating and cumulative contribution and a conditional payback scenario.
Old 9.38 campaigns retain their contract. [Rules and measured limits](partner-cards.md).

All 316 standard regression command entries passed on unchanged inputs,
with 33 actual browser assertions, five final 36-month legal-plan replays,
exact historical-contract replay, and package runtime / ZIP extraction checks.
See the evidence ledger (local-only: `game/reports/local/card-balance-20260927/README.md`).
Nothing is published; human playtesting and physical two-computer acceptance
remain separate.

## September 27 — Partner-issued cards (local 9.38 candidate)

New Expanded campaigns add **Banking → Cards** with paid research and licensing,
finite Cedar Reserve funding, actual customer payments, arrears, provisions,
charge-offs and recoveries. Player compensation and direct costs are separate
from issuer-owned receivables. See [the rules and walkthrough](partner-cards.md).
Existing campaigns retain their rules; Core remains 8.20. The prior source and
packages are preserved. All 314 standard fast-gate command entries passed
on unchanged gameplay source, with one reviewed fingerprint-only test retry.
Also passed: 29 actual browser assertions, the legal eighteen-month
campaign replay, and package runtime / independent ZIP extraction checks.
Human balance and physical two-computer acceptance remain unverified. Nothing is published.

The current local evidence (local-only: `game/reports/local/partner-cards-20260927/README.md`)
separates legal campaign playthroughs, adverse fixtures, actual browser checks
and physical/human acceptance.

## September 27 — Expanded 9.37 playtest and presentation polish

The [focused playtest](expanded-playtest.md) completed four 18-month treasury
campaigns, 38 real two-browser loopback LAN checks and 22 native file-origin
browser checks. Three presentation fixes keep announcements visible when results
open, preserve the current inspector during rival updates, and distinguish late
invoice collections from current-invoice payments. Engine bytes and save versions
are unchanged. All 312 standard fast-gate command entries passed against the final
frozen build; package source/runtime and independent ZIP extraction checks also
passed. See the
current evidence ledger (local-only: `game/reports/local/expanded-playtest-20260927-111150/README.md`).
The original 9.37 package below remains preserved. Physical peers and human balance
acceptance remain unverified.

## September 27 — Digital + Commercial and funding (local 9.37 candidate)

New Expanded campaigns now select **9.37**, retaining the completed 9.36 business consolidation. Five paid research nodes connect to the existing treasury platform and shared customer service book. Cedar Reserve Bank offers actual funded one-month advances. Historical campaigns retain their rules and paid work.

See the [implementation and player walkthrough](digital-commercial-milestone.md), [card foundation specification](card-program-foundation.md), and current evidence ledger (local-only: `game/reports/local/digital-commercial-20260927/README.md`). All 312 standard fast-gate command entries and 44 isolated browser checks passed against the final build. Package source/runtime, recovery, rematch and ZIP extraction checks passed. Complete terminal receipts and hashes are recorded in that ledger. This is a local engineering candidate; physical multiplayer and human balance acceptance remain unverified.


## September 27 — Expanded business consolidation (preserved 9.36 baseline)

New Expanded games use **9.36**, with an explicit `expandedBusinessVersion: 1`
boundary. Core remains 8.20; existing saves and rematches retain their saved
economics, paid projects and earned benefits.

- Campaigns now have an exact monthly advertising budget and one optional
  community or sports sponsorship. Review distinguishes adjustable spending
  from signed payments, cancellation costs and the end month.
- Business services starts with Payroll, Merchant services and Corporate
  treasury, with selected-service setup, pricing, capacity and searchable clients.
  Household opportunities go to Deposits; forecasts and earned whole-book results
  are labelled separately.
- A shared digital platform can be built or licensed once for the bank. Remote
  acquisition uses finite central staff and local demand; studios are optional.
- Holding-company issuance, voluntary rival trades and share retirement use
  funded counterparties and protected parent cash, with dilution and control
  quotes. Selling bank portfolio securities remains a separate Treasury action.
- New rules retire obsolete initiative controls and AI/submission paths. The
  map retains its artwork, restores visible physical-office comparisons and has
  one selected-market Build here action. Sponsorship identities and start events
  appear for both banks.

Portable SHA256: `6ccb3144b4c761ad43a20ccf8f47f8c4b5fdd69aa94a264a16f5177a972ce729`.
Engine SHA256: `42d291957e83f1a7e78445bd685f6e268a3d5c2d694eb7eb3b042b25dc2626c2`.

The preserved 9.36 portable passed **54 isolated browser checks**, including real
staging and two-bank hotseat settlement, with no script errors. Desktop and
480px screenshots were inspected. All **308 fast-gate commands passed** across
fourteen shards with identical, unchanged inputs (321 executions include thirteen
repeated build checks). The aggregate receipt verifies every command and terminal
result against that preserved build. Those receipts do not certify 9.37.
See [implementation and compatibility](expanded-consolidation.md) and
local evidence (local-only: `game/reports/local/expanded-consolidation-20260927/README.md`).

Nothing is published. Native file-origin persistence, physical multiplayer peers,
the full release balance gate and human gameplay acceptance remain separate.
Prices, limits and response strengths require playtesting before release.

## September 27 — Research funding shortcuts (previous verified checkpoint)

Expanded Research restores **+$50k** and **Stage max** alongside its exact custom
amount. These explicitly stage the selected branch only, using existing engine
milestone, monthly and protected-budget limits. +$50k starts from the working
amount; Stage max replaces it with the allowed total. Operating models link to
the selected capability's funding editor. Engine and save rules are unchanged.

Portable SHA256: `10adb6665f5a81685c681348234a2fe5924e4d9f075e3434da46d7e9f5049804`.
Engine remains `e348b9f3c84207ee4cef3b989d74434c29f26ad84854697d65188c9f9dfeb5a1`.
All **18 targeted check commands passed** with stable inputs, including the
27-case People/Strategy suite in source and portable modes. **20 isolated browser
checks** passed; desktop and 480px screenshots were visually inspected. The
checks cover exact custom amounts, repeat increments, caps, invalid inputs,
stale controls, context returns, unrelated plans, Review removal and unchanged
simulation state. See evidence (local-only: `game/reports/local/research-shortcuts-20260927/README.md`).
The full fast/release gates were not rerun; prior receipts below certify their
own builds. Native persistence, physical peers and human acceptance remain
separate. Nothing is published.

## September 27 — Map, locked expansions and Summary follow-up (previous verified checkpoint)

The original isometric city map now sits inside the new Markets workspace,
retaining authored geography, district artwork and local office inspection.
Selecting a district still does not stage a monthly focus change.

Unopened Insurance and Investment / Brokerage companies now show locked
expansion preparation. Existing quotes govern funding, costs, staffing and
permission waits. Shared People choices remain working edits until the complete
launch is added; one Review row removes the launch and its dependent setup
together. Active saves keep their operating companies, and supported closed
businesses can restart. Trust is explicitly a locked future expansion, with no
purchase or invented business model. Bank-owned liquid securities offers remain
available in Banking → Treasury without an owned brokerage.

Summary now has recorded score comparisons, current rankings, and a scrolling
cosmetic bank ticker. Prices are the final recorded score divided by ten,
rounded to cents with a $0.01 floor. Changes compare recorded closes; private
plans and early intermediate score deltas are not used. Pause and reduced-motion
support are included. No trading, economic, RNG or save-schema changes occur.

| Map/expansion/ticker checkpoint artifact | SHA256 |
| --- | --- |
| Portable `game/BRANCH_WARS.html` | `a1dd956928a8603797b8a22af88626ec0a017bd47dde0f391fbf68684849bfd6` |
| Engine, unchanged from the starting build | `e348b9f3c84207ee4cef3b989d74434c29f26ad84854697d65188c9f9dfeb5a1` |

All **32 targeted verification commands passed**, including source and portable
runs of the four interface suites, map/context/navigation/ownership, plan review,
investment/agency/shared-premises UI and monetary-policy UI, plus build,
architecture and documentation checks. Inputs remained unchanged during the run.
The four interface suites contain 70 cases per mode.

Current-artifact isolated Chromium evidence passed: **73 new checks and 14
visually inspected captures**; 31 existing routes, 60 layout checks and 29 captures;
45 keyboard/focus checks; and five existing planning/hotseat flows with ten
captures. Actual monthly resolution changes the ticker, inspecting/preparing
does not mutate saved books or RNG, and the updated agency workflow stages and
removes its full launch from an earned-dividend fixture.

See follow-up evidence and screenshots (local-only: `game/reports/local/map-expansions-ticker-20260927/README.md`)
and its `verification-summary.json`. The earlier 300-command gate below applies
to the preceding rebuild; the full fast/full-release gates were not rerun for
this presentation follow-up. Native launch, durable storage, native zoom,
physical two-computer play and human acceptance remain outside the isolated
browser evidence. Nothing has been published.

## September 27 — Expanded interface rebuild (previous verified checkpoint)

Expanded now uses six primary homes: **This month, Markets, Banking, People,
Strategy and Financial Group**. Reports and Save & help are secondary. Focused
object editors replace the overlapping Expanded desks; the header keeps the
authoritative available-spending quote, commitments, cash, capital and Review
month visible. Core retains its existing interface.

Markets owns physical office work, Banking owns product terms and portfolios,
People owns employment and qualifications, and Group owns subsidiary operations
and ownership. Unfinished values remain private working edits until Add/Update.
Review shows the shared plan, scoped Edit/Remove, recurring costs, blockers and
the original Ready/Recall controls. Contextual Return restores location rather
than replacing the financial draft. See the [control ownership and parity
map](expanded-interface.md) and [player guide](player-guide.md).

| Rebuild checkpoint artifact | SHA256 |
| --- | --- |
| Portable `game/BRANCH_WARS.html` | `4fa6e7c4190033ddf2801017921c6973b45af6c5a11a55a3718ec3f71ffe4f7e` |
| Engine, identical to the preserved starting build | `e348b9f3c84207ee4cef3b989d74434c29f26ad84854697d65188c9f9dfeb5a1` |

The portable is generated from 222 registered source files. This presentation
rebuild does not change Core 8.20, Expanded 9.35, saved economic profiles, save
schemas or engine rules. The prior build and source/tests/tools/docs were
preserved before editing. Nothing has been published or uploaded.

The final **300-command fast gate passed** across all 16 canonical shards
(315 invocations because each shard repeats the build check). Every terminal
receipt confirms identical portable and input hashes, with no input changes.
The collector also checked complete command coverage and the final current
source fingerprint. Earlier interrupted or changed-input matrices are diagnostic
evidence, not completed passes. Exact receipts are collected in
`reports/local/interface-rebuild-20260927/verification-summary.json`.

Current-build browser evidence includes 30 routed views, 59 layout checks and
29 main screenshots; three months submitted through the real UI; announcement
once-only publication; campaign export/import; Core startup; five focused editing
and hotseat workflows; 45 keyboard/focus checks; and seven enabled primary-button
contrast checks. Desktop sizes are 1920×1080, 1366×768 and 1024×768, with a
480×900 narrow window and explicitly labelled CSS 125% layout stress.

A separately labelled, engine-settled month-13 fixture supplies three operating
offices, a completed visiting-adviser desk, operating subsidiaries and seven
retained investment clients. Its 24 browser checks passed, including finite room
time, employer navigation, retained working edits and unchanged settled books.
Its synthetic initial capital is disclosed; this is mature-interface coverage,
not ordinary-opening economic or balance acceptance.

The local delivery record (local-only: `game/reports/local/interface-rebuild-20260927/acceptance.md`)
links inventories, screenshots and detailed receipts. Browser runs use isolated
Chromium, generated HTML, blocked external requests and in-memory storage. Native
file launch, autosave/Continue after a restart, native browser zoom, physical
two-computer connectivity and human gameplay acceptance remain unverified. The
full release/calibration gate is separate from the fast gate. Automated behavior,
rendered visual inspection and human acceptance are distinct claims.

## September 26 — Expanded Federal Funds implementation (historical baseline)

New Expanded campaigns now select **9.35 / monetaryPolicyVersion 1**. Core stays
8.20 and existing Expanded saves/rematches retain their saved rules. This local
candidate has not been published.

- Shared policy decisions occur before planning in months 3, 5, 7 and onward,
  with a dedicated deterministic RNG and 12-decision history, including holds.
- Bank securities have liquid and fixed 6-/24-month holdings. Fixed coupons stay
  fixed; funded maturities return principal, and early sales realize market gains
  or losses. Changing investment policy does not erase existing contracts.
- Emergency borrowing costs the policy anchor plus 825 bp annually on opening
  debt. Existing deposit guarantees, loan coupons and client notes keep their terms.
- Overview has a compact Fed card and **Inspect bank impact**. Rate comparisons
  and maturity tables use engine quotes; investment policy uses Review/Stage/Cancel.
  Contextual banking links retain the shared draft. No extra workspace or selects.
- Public monetary state excludes RNG state. Holdings and staged treasury policy
  remain owner-private, with explicit old-peer refusal and save validation.

Only liquid bank securities can be offered to the investment dealer at par.
Player quotes, planning validation, AI offers and funded settlement share that
limit; fixed investments cannot bypass their early-sale gain or loss.

| Current local artifact | SHA256 |
| --- | --- |
| Portable `game/BRANCH_WARS.html` | `e4a4f66e7119f38474d92a12fda243d832979fde0a13c3c4c6e0962d63a1555d` |
| Engine | `e348b9f3c84207ee4cef3b989d74434c29f26ad84854697d65188c9f9dfeb5a1` |

Focused domain/UI checks and all three simulated transports passed on source
and portable builds. Exact pre-Fed replay covers legacy 8.1, Core 8.20,
Expanded 9.33 and 9.34: creation, AI/RNG, half-ready restore, settlement and
both private views. Four scenarios on the final engine each completed eight
months with fixed versus liquid policies and dealer offers; every month checked
accounting, owner-view validation and identical half-ready restore/continuation.
The complete **292-command fast gate passed** across all eight canonical shards
(299 invocations because each shard repeats the build check). Every terminal
receipt records the same portable and input hashes, with no source changes
during verification. `reports/local/federal-funds-20260926/verification-summary.json`
collects the receipt paths, final hashes, replay results and calibration limits.

Longer calibration is diagnostic, not a balance or final-build acceptance pass:

- Earlier candidate engines completed 14 adaptive AI campaigns of 36 months
  (504 resolved months) across moving-rate and held-rate comparisons. Eight
  completed runs came from a larger interrupted sweep; the other six came from
  the remaining three scenarios. The full 96-case adaptive sweep did not finish.
- A separate 96-case standing-plan matrix resolved 2,550 months. Six cases
  completed 36 months; 88 stopped when unchanged plans failed the existing 8%
  post-spending capital requirement, and two stopped at month 35 when office
  staffing exceeded the shared department pool. Both moving-rate and held-rate
  controls encountered these stops. The failed plans/states are retained, not
  counted as passes or used to retune rates. These runs predate the final
  dealer-offer fix.

Receipts and the preserved pre-Fed baseline are in
`reports/local/federal-funds-20260926/` and
`reports/local/before-federal-funds-20260926/`. Full Windows release verification,
live layout/keyboard acceptance and physical two-computer play remain unverified.

## September 26 — Federal Funds design pass (historical checkpoint)

The [Federal Funds proposal](federal-funds-design.md) traces the existing rate
consumers, defines the first Expanded slice, contract timing, private exposure
forecasts, shared policy decisions, interface placement and implementation gates.
It is a design deliverable, not an implemented monetary-policy system. No game
source, playable artifact, campaign or saved economic rule changed in this pass.

A reproducible local diagnostic compares current-engine forecasts at 3.25%, 3.75%
and 4.25%, with a fixed opening bank/plan and other macro factors held constant.
Both Core 8.20 and Expanded 9.34 preserve campaign/view/RNG state during the probes.
The Expanded opening case benefits from a hike through its large securities book;
this is evidence for exposure-based design, not a full-game balance conclusion.
The script and receipt are in `reports/local/federal-funds-design-20260926/`.
At that historical checkpoint, the portable SHA256 was the JPG value below.

## September 26 — Optional JPG bank logos

The local Core and Expanded identity editor now accepts optional `.jpg` / `.jpeg`
files up to **200 × 200 pixels and 100 KB (102,400 bytes)**, alongside the existing
crest, monogram and color. Rectangular images retain their proportions; oversized
files are refused without replacing the selected logo. The browser decodes and
re-encodes the image to remove file metadata. Logos are embedded in the portable
game's saves and shared identity messages; no image host or external URL is used.

Setup previews the image immediately. In a multiplayer lobby, **Save identity**
shares the draft and resets both players' readiness. **Use crest instead** removes
the image while retaining the crest settings. Pending uploads block confirmation;
late completions after cancellation, reconnect, setup changes or leaving are
discarded. Campaign rules and save versions remain unchanged.

| Pre-Federal-Funds JPG artifact | SHA256 |
| --- | --- |
| Portable `game/BRANCH_WARS.html` | `48bfd47558fc706203c52b041ef8739245c2671a4e368f0df4206d47b936ba8f` |
| Engine | `6af79a9381559d0dd77a69a18479ce39ad4c2b2fa7dd2b92df8d2bfc3ae7f82e` |

Validation includes real JPEG fixtures, malformed/oversized input refusal,
Core/Expanded save/rematch and economic neutrality, draft/async guards, and
GitHub/LAN/direct simulated peer flows. An independent exact replay against the
preserved pre-JPG portable covers legacy 8.1, Core 8.20 and Expanded 9.33/9.34,
including preset identities, AI/RNG, half-ready recovery, settlement and both
player views. Local receipts live in `reports/local/jpg-logos-20260926/`.

These are scoped automated checks. The earlier 285-command fast-gate result below
belongs to the pre-JPG candidate; this small follow-up does not claim a new full
gate run. Browser decoding is stubbed in the upload tests. Live file-picker/layout
acceptance and physical two-computer play remain unverified. Both players should
use the updated game file. Nothing was published.

## September 26 — Local market desk and multiplayer personality candidate

This local candidate follows the clean PR26 download. Source changes are in
`game/src/`; the portable game is rebuilt from that manifest. No release or
remote branch was published. Core remains 8.20 and Expanded remains 9.34;
existing saves retain their economic rules.

| Pre-JPG local artifact | SHA256 |
| --- | --- |
| Portable `game/BRANCH_WARS.html` | `26b5c91ac77a18a6dc6a063a693e94bf802c7356048cfeb2170287a652eb7f34` |
| Engine | `48dd7a492eeabbd24c880f10aec306c12f2686cc66da43515a9133101e18c44b` |

- **Markets:** selected-market conditions, Your presence, staffing/maintenance,
  expansion/services and conversion share the map inspector. Construction is
  reviewed and staged there. Bank-wide comparison remains available. Ordinary
  office and service controls use visible choices rather than nested disclosures.
- **Banking:** actual deposit terms, lending portfolio/standards, and funding/
  capital policies have explicit destinations. Contextual Return retains the
  shared draft and working office forms, including routine guest state updates.
- **Identity:** four preset crests, monograms and bank colors work in Core and
  Expanded, including lobby transports, saves/resume, headers and results.
- **Announcements:** Overview provides Public/Shareholders, exact preview and
  staging, editing/removal, and a 240-character plain-text limit. Messages remain
  owner-private until resolution, appear once before ordinary round events in
  seat order, and have no economic or random effect. The audience is cosmetic.
- **Staffing:** headcount remains whole people. Fractional office allocations
  are explicitly monthly work time, backed by the unchanged finite staff quote.

Focused source checks cover announcement neutrality/privacy/resume, bank marks,
context returns, distinct office edits, same-month guest refreshes, construction
confirmation, and restoring the same live editor after inline review. An
absent-feature replay compared untouched baseline and current engines for legacy
8.1, Core 8.20, Expanded 9.33 and 9.34 without changing the saved campaign.

All **285 canonical fast-gate commands passed** across eight shards, with the
portable and checked inputs unchanged during each successful shard. The local
receipt is `reports/local/market-personality-20260926/verification-summary.json`.
Historical comparisons used the original Git objects in a separate verification
cache because this downloaded folder has no Git metadata. To repeat those checks
here, use a normal clone with history or set `GIT_DIR` to the absolute path of
`game/reports/local/verification-history.git` for the test process.

These checks use engine and headless DOM/network harnesses: live browser layout/keyboard acceptance,
two-computer play, and the hours-long full release gate are separate and have
not been claimed. Existing frozen releases, saves and golden fixtures remain
unchanged. Use the same updated build on both multiplayer computers.

## September 26 — Expanded 9.34: lending from the balance sheet

New Expanded campaigns start at save `9.34` (`balanceSheetLendingVersion:1`). Every 9.33 and
earlier campaign keeps its rules: `balance_sheet_lending` replays 9.33 against the frozen rc4
package, and the lab's 9.33 numbers below equal the committed baseline exactly. Nothing is
republished; the rc5 ZIP starts Expanded at 9.33 and cannot join a 9.34 campaign.

| Prior PR26 artifact | Identity |
| --- | --- |
| Portable `game/BRANCH_WARS.html` | `9a1a39dd1aa6347a9914925d5e7ebb4d65c35e3c1d49838b748fb515b6a2109c` |
| Engine | `3eb11003a82539c9964bd98e3647ed0cab82a6d7079bcbada2aa9b77206b896e` |

**Why.** The balance lab (`game/tools/edition_balance_lab.js`, baseline
`game/output/edition-balance-baseline-933.json`) showed a 9.33 bank holding about $30M of
deposits with a $3.7M loan book and $13–16M of idle cash. Local office capacity bound lending
almost every month, and every bot converted its only retail branch into an ATM, because its
valuation counted the upkeep saved but not the deposits and loan capacity given up.

**What changed, 9.34 only.**

- Lending bankers deploy 10% a month of the gap between the loan book and 80% of deposits,
  beyond local office capacity. Staffing at least four on Lending gives the full rate. Spare
  cash, credit administration coverage and the lending multipliers still apply.
- The AI never converts away its last full-service office, and it values an office
  conversion's deposit growth at the lending margin as well as its upkeep.
- The AI's recovery search no longer forces cautious lending and a liquid capital policy for
  a thin month when capital is at least 10% and funding is covered. One month of income cannot
  see the interest new loans earn, and every Expanded bank starts under the $60K trigger.
- Credit shows what central deployment adds; help and the shrinking-loan notice explain it.

**Measured** (`game/output/edition-balance-expanded-934.json`, 36 months, seeds 1–3, six banks
per scenario, same-rule AI in both seats; means at month 36):

| | 9.33 Balanced | 9.34 Balanced | 9.33 Rate | 9.34 Rate |
| --- | --- | --- | --- | --- |
| Loans / deposits | 13.4% | 30.0% | 12.9% | 40.8% |
| Loans | $3.7M | $9.4M | $3.8M | $13.1M |
| Cash | $13.5M | $9.6M | $15.7M | $8.3M |
| Capital ratio (lowest bank) | 30.2% (21.5%) | 15.8% (10.1%) | 32.1% (25.5%) | 17.8% (14.5%) |
| Operating profit, month 36 | $47K | $60K | $48K | $87K |
| Cumulative operating profit | $1.7M | $1.3M | $1.3M | $1.9M |
| Only retail branch converted to | ATM | digital | ATM | digital |

No campaign failed or ended. Every 9.34 bot kept a full-service office.

**Rejected alternatives, kept as evidence.** A 20% deployment rate
(`edition-balance-lending-934-c.json`, seeds 1–2) cut cash to about $4M, took one bank's capital
ratio to 8.4% and lowered month-36 profit to $66–75K a month. A cash floor under central
deployment at 6% or 10% of deposits (`edition-balance-floor-06.json`, `-10.json`; tried and
reverted on this branch) did not stop a bank losing deposit share, and at 10% capital dipped
to 7.1%.

**Known issues.**

- One of the twelve 9.34 bots (Balanced, seed 1) loses deposit share to its rival, falling
  from $23.9M to $12.5M of deposits, and ends with −$0.2M cumulative operating profit. 9.33
  shows the same split more mildly. The losing bot never defends its deposits: it stays on
  Margin pricing with one Service banker. This is an AI deposit-competition problem, next.
- Balanced 9.34 banks earn less in their first year while the book builds (month 12: $13K
  against $44K a month), so three-year cumulative profit is still below 9.33 there.
- Expanded remains far smaller than Core. Core 8.20 banks reach about $98M of deposits and a
  61% loan-to-deposit ratio in the same 36 months; Expanded deposits stay near $30M.

**Verification so far:** balance_sheet_lending, behavior-golden, runtime-stages, determinism,
campaign-lifecycle, bank_economics(+_ui), bank_rivalry, expanded_edition(+_network),
research_program(+_ui), research_bot, research_delivery_expanded, build, engine,
v31_version_boundary, package_release, income_review(+_ui), facility_conversion_lifecycle,
facility_lifecycle_legacy_compat, facility_extensions_ui, department_runtime,
department_ai_lending, usability_help, architecture(+_scope), docs and the engine pin. The
complete fast gate runs on the pull request.

## September 26 — main carries the rc5 repairs

The published rc5 repair (tag `v4.0.0-rc5`, branch `release/v4-stabilized`) was never merged
to main. Main was instead built from rc4 on a separate line, so the working copy that the
README points players to still had rc4's loader defect: reloading a Core 8.20 save deleted
any Risk & Capital model and any third operating model (reproduced: `{"risk":"provisioning",
"network":"franchisePartners"}` became `{}`). This merge brings rc5 onto main alongside
main's later default-Core, multiplayer-resume, monthly-desk and mandate work. Nothing is
republished; the rc5 ZIP stays the packaged download.

| Working artifact | Identity |
| --- | --- |
| Portable `game/BRANCH_WARS.html` | `76652a6fa77bd48bbbaaf13accada70dcde395d9e6779b86bbc2e3e1621b50f4` |
| Engine | `678af36463e2caa400c1ecdce16abf4648b9c14dc47621b1ebfe04ada52030a9` |

- **Bot product gate:** both lines had moved research gating into the bot. Main's shared
  `researchAllowedProducts` is kept; rc5's context-based chooser for all 18 Core models is
  added. `research_bot` proves every other plan field and every AI random draw match the
  published rc4 bot.
- **Frozen packages restored:** the merge onto main had pruned `releases/v4` (rc2) and
  `releases/v4-rc3`, which `income_review`, `research_bot` and `package_release` load as
  pinned references, and had twice rebuilt the frozen `releases/v4-rc4` from later source.
  All three are back to their published bytes; `releases/catalog.json` now verifies them.
- **CI:** every push to main since the V4 merge failed within seconds at
  `tools/check-release-catalog.js`, which still pinned the V3-era main game and read the
  pruned V3 manual, so the fast gate never ran on GitHub. The catalog is now schema 2 and
  pins only what `releases/` stores. `docs.test.js` also failed on six links to pruned
  packages; they now point at the release tags that hold those files.

**Verification so far:** scoped checks passed on the merged source: build, architecture,
behavior-golden, runtime-stages, determinism, campaign-lifecycle, bank_economics,
bank_rivalry, expanded_edition(+_network), engine, research_program(+_ui), research_bot,
feature_setup, github_resilience, agency_legacy_compat, agency_peer_compat,
v31_version_boundary, strategy_workspace, package_release, income_review, docs, both
release-catalog checks and the engine pin. The complete 278-command fast gate then
passed on GitHub CI for PR #22, split over eight runners. That needed two more CI fixes:
the gate had grown to about three sequential hours, past the 60-minute job limit, and
three replay tests read old builds from git history that the default shallow checkout
lacks. The full Windows baseline did not finish inside its 180-minute limit and has never
passed for V4, so by the owner's decision it runs on demand and weekly instead of on
every pull request; a local Windows run remains the release gate.

## September 21 — V4 rc5 Core Research & Stabilization

**Verified package with complete exact command coverage across qualified runs.** [V4 rc5](https://github.com/NerdyGeneral/BranchWars/releases/tag/v4.0.0-rc5) provides the [six-file game ZIP](https://github.com/NerdyGeneral/BranchWars/releases/download/v4.0.0-rc5/branch-wars-v4-rc5.zip), byte-identical to the tested local stabilization package. [Repair status](rc4-local-repair.md) · [release notes](../../releases/v4-rc5-notes.md) · [public verification summary](../../releases/v4-rc5-verification.json) · [Claude Code review summary](../../CLAUDE_CODE_REVIEW.md). Earlier frozen releases remain unchanged.

| Current artifact | Identity / evidence |
| --- | --- |
| `branch-wars-v4-rc5.zip` | ZIP SHA-256 `38a734cfd98e14d8512108a392a286581a0b4774fb3376f614e98e12dd60c672` |
| Working and packaged portable | `26d9603689678aaed44ffa2c0981b65877b62cc1d3f78aa2cb43579fec1e0af3` |
| Engine | `8bf022b18ceb1efdd646f32123b519495c5324e7609195ae1fe64b03b4369d0f` |
| Qualified command coverage | 278 exact standard commands; original full gate remains failed at 3/44 |
| Package verification | All six archive/extracted files match source; current-profile runtime smoke passed |
| Actual Claude Code review | Scoped package review closed; independent fingerprint, coverage-citation and ZIP checks |

The complete 214-entry baseline has 213 passes and one exact stale engine-pin failure; separate full outer tail 41/41 and standard supplement 71/71 passed with unchanged inputs. After all runs terminated and all 11 compatibility/build/research prerequisites passed, the approved engine pin/comment and package-README prose were applied and both affected complete checks passed. The failed pin row is mapped explicitly to the standalone pass; the original failed receipts remain unchanged. The qualifier checks exact schedules/arguments and two-file fingerprint reconstruction. Its `fullGatePassed:false` and `continuousStandardGatePassed:false` are intentional: this is complete command coverage across runs.

The fixes retain paid research through reload and campaign rules through rematch, improve Core operating-model adoption, correct research descriptions and open the visible service controls from Strategy. Household-enabled campaigns route services to Customers/commercial; service-only campaigns without household ownership retain Markets. Explicit Core selection and confirmation starts 8.20; untouched setup stays 8.19. Check Research for six capabilities including RISK & CAPITAL. Confirmed Expanded starts 9.33; imports/rematches preserve saved rules.

No browser/human or physical two-computer acceptance is claimed. Automated Windows LAN checks passed. Model reachability, valid recovery proposals and automated census runs do not establish strategic balance. The standard release-balance runner's legacy configuration must not be relabelled as current Core/Expanded balance. Sustained Expanded recovery and conventional-lending balance remain open. Full blueprint completion is outside this prerelease.

## Historical release and checkpoint evidence

Everything below describes its named older artifact/checkpoint, including past pending/interrupted gates and browser samples. It is preserved history, not rc5 status. The earlier September 20 candidate and joint reviews remain local historical evidence; its 50fff06d portable differs from rc5. Raw local diagnostics and review workspaces are not part of the public package.

**September 14, 2026 · implementation incomplete.** This page owns artifact identity, known issues and release gates. The [implementation ledger](v3-usability.md) owns the full completed/remaining checklist. Detailed prior test narratives are in the [release archive](archive/release-history-2026-09-13.md).

Detailed local diagnostics and raw campaign dumps are preserved but not bundled
with the publication. Paths marked **local evidence** identify those retained
files, not downloadable GitHub artifacts; published results and limitations are
summarized here and in the V4 package verification.

## Which version am I looking at?

### V4 rc3 publication candidate: checkpoint68b subject ownership and persistent rivalry

The user authorized GitHub V4 publication after the local68b handoff. The target
is `release/v4-playtest`, tag `v4.0.0-rc3`, not main. The updated V4 ZIP and
`releases/v4-rc3` contain the corrected build; `releases/v4` remains the frozen
rc2 compatibility reference. [Publication notes](../../releases/v4-playtest-notes.md)
and [package verification](../../releases/v4-verification.json) distinguish this
playtest from release acceptance. Portable SHA256
`a3c293cfe58ac21f97df256fe28bc06e35f14f14518015d2fd2cd26479052ccf`;
engine SHA256 `c2e3fb478e3f5a188de962eb0fbc82740f316a8b25db1b210cc991c4bedc0636`.
202 source inputs; Core8.19 unchanged, new Expanded9.33 explicit
`bankRivalryVersion:1`. Earlier saves and rematches keep their old rules.

- People now owns allocation; Customers owns commercial relationships, offers
  and applications; Products owns catalogue, pricing/policies, advertising and
  statements. Markets keeps contextual construction, conversion and staffing.
  The same live controls and shared draft move, not copies. Core restores its
  simpler layout. Warning/help/market/client shortcuts open the correct editor.
- New Expanded campaigns no longer stop through automatic score or market
  control. Receivership and funding-covenant resolution remain; company
  acquisitions retain funded transactions.
  An obsolete bank-takeover defense is blocked with an explanation. Matching
  `bankRivalrySupported:1` is required on both peers. No additional checkbox.
- No interest rate, payroll, reserve threshold, growth quota or subsidy tuning.
  The narrow strategy evidence below does not justify calling the economy balanced.

**Verification:** the UI-only tranche passed a clean
29-command scoped gate (local evidence: `game/reports/baselines/stabilization68-scoped-2026-09-14T23-28-27-912Z-e5b5b4b1-284b-447d-9b7d-d6ffd486e016.json`)
with unchanged inputs on portable1cb80c01 / enginebb2b38b8, before the new ending
boundary. That receipt is preserved, not relabelled as the final candidate's full
gate. New ending checks reproduce the old auction, preserve old9.32 seeded
creation/AI/state/RNG/private views, reject inconsistent markers, and cover
receivership, half-ready recovery and rematch. All three simulated transports
refuse old peers and pass new-rule start, two months, checkpoint reload, private
records and delayed-frame protection. Current setup/lobby tests also pass.

The full Windows gate started at23:50:09 UTC was deliberately interrupted;
journal stem
`reports/baselines/gate-2026-09-14T23-50-09-522Z-f91ae504-b739-4f7b-b28a-fca39c60ae66`.
It has no terminal success receipt and is not a clean pass. The new rivalry
validator incorrectly rejected the valid `funding_resolution` ending; it now
admits that alongside receivership. The added test borrows against securities,
settles three actual covenant breaches, then validates the ended save, private
views and rematch. This is a funded stress fixture, not a player-policy balance
trial. A fresh full gate from the beginning is required on the corrected build.

That fresh full run started00:35:45 UTC on September15 (September14 local),
journal stem
`reports/baselines/gate-2026-09-15T00-35-45-820Z-55faf473-26d7-410d-adba-8388d487419f`.
Source/test/reference inputs are frozen during the run. Its terminal outcome is
pending; neither a running check nor the earlier interrupted run is a pass.

**Actual browser sample:** portablebbe49017 (before the terminal-validation-only
correction) opened the existing9.32 test save and
a fresh Expanded campaign through normal setup. The confirmation kept five
benefit bullets, not a dependency wall. People displayed live allocation and
shared coverage; Products had one outer desk row and its pricing shortcut opened
the selected product's real Pricing editor. Customers' application/relationship
controls and the Markets-to-Foundry-Works inspector were exercised on the same
UI tranche. No final console errors were observed. These are sampled workflows,
not every control or subjective player acceptance.

| Browser candidate sample | 1280×720 | 760×800 |
| --- | ---: | ---: |
| Document scroll width |1265px|745px|
| Command navigation height |74.61px|125.08px|
| Visible native selects, bank policies |2|2|

No document horizontal overflow in those samples. People overview and the
individual product Pricing editor had zero visible native selects; this is not
a claim that the whole game has no dropdowns. The monthly review can be collapsed
without losing draft instructions. Real two-computer acceptance remains open.

#### Controlled lending/expansion diagnosis

Balanced (local evidence: `game/output/stabilization68-balanced/report.json`) and
Rate Shock (local evidence: `game/output/stabilization68-rate/report.json`) cover143 actual
campaign-months, not144: the original Balanced lending policy ended at23.
Each compares the old paid policy against two-Operations staffing, with and
without new paid hiring/construction. Both use existing finite workers and
funded service; two Operations is not guaranteed adequate risk coverage. Every
submitted plan, ledger and operating-income bridge validated; zero proposal
rejections. The captured trial portable is e5baa556, with the same bb2b38b8
economic engine as checkpoint67, not the later9.33 UI/ending build.

| Scenario / policy | Months | Outcome | Closing bank equity | Cumulative operating profit | Last monthly operating profit |
| --- | ---: | --- | ---: | ---: | ---: |
| Balanced / prior lending |23|Receivership|−$349,876|−$1,962,384|−$142,531|
| Balanced / controlled staffing, no new expansion |24|Ongoing|$2,738,125|$75,683|$33,398|
| Balanced / controlled staffing, paid expansion |24|Ongoing|$1,041,346|−$1,744,346|−$5,849|
| Rate Shock / prior lending |24|Ongoing|$1,084,669|−$1,072,976|−$114,826|
| Rate Shock / controlled staffing, no new expansion |24|Ongoing|$1,574,285|$207,299|−$66,988|
| Rate Shock / controlled staffing, paid expansion |24|Ongoing|$1,058,971|−$866,616|−$2,133|

Interpretation: the month23 failure does not establish that conventional lending
is impossible. Staffing and construction timing matter, and upfront affordability
does not establish payback. Positive final equity is not operating profitability:
events, awards and other movements also affect retained earnings. The no-expansion
Balanced loan book still shrank from$9.5M to$8.68M. Rate Shock endings were strained,
including zero cash in the no-expansion arm. These small samples do not establish
120/480-month viability, optimal play or enjoyable comeback opportunities.

A fresh 120-month protected-commercial trial under9.33 (local evidence: `game/output/income-banking-rivalry68-commercial/report.json`)
completed without an execution error, rejected strategy proposal or ending.
It starts at month1; no ended save was revived. Both banks' complete recorded
bank snapshots (including stats, reports, plans and offices) match the prior
checkpoint67 commercial trial exactly for its82 months. Only the new campaign
continues afterward. This isolates the ending boundary rather than retuning
economic results to obtain a longer game. Its captured portable2f166bc1 uses
enginee67afb52. The current candidate subsequently corrects terminal validation
of funding failures (not encountered in this trial) and changes the Operations
caption. Do not relabel this as a120-month execution of the corrected engine.
The correction exactly restores both the trial's opening and120-month closing
snapshots, including both owner-private views; that is a compatibility check,
not another120-month simulation.

| New rivalry at month120 | Deliberate commercial bank | Ordinary AI rival |
| --- | ---: | ---: |
| Bank equity |$8,818,088|$2,296,132|
| Deposits |$61,424,934|$22,316,168|
| Loans |$14,371,618|$2,210,968|
| Employees |26|3|
| Last monthly operating profit |$133,718|$196,132|
| Cumulative bank operating profit |$17,861,023|$11,279,392|

The commercial bank owns73.35% of these two banks' combined deposits, not of the
whole outside economy. Its rival remains profitable with a much smaller lending
operation. This supports sustained play, not equally strong strategies, enjoyable
comebacks or480-month acceptance. Retained earnings, distributions and other
non-operating movements remain distinct from the operating-profit totals.

The unchanged-rule conventional-lending extension (local evidence: `game/output/stabilization68-balanced120/report.json`)
has completed:175 actual campaign-months across its three arms (23+120+32), not
360. It deliberately retains9.32 to compare the same policies, not to upgrade
an existing save or attribute economic changes to the new ending rule. All71
months in the earlier Balanced comparison reproduce exactly before extension.
There were zero execution failures or rejected policy proposals. All three
closing snapshots restore exactly, with valid ledgers and both owner-private
views, on the corrected engine. Captured portablebbe49017 / enginee67afb52;
driver89bed811. This is not175 additional unique months beyond the prior trial.

| Extended Balanced policy | Months | Outcome | Closing equity | Closing loans | Cumulative operating profit | Last monthly operating profit |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Prior lending |23|Receivership|−$349,876|$3,656,962|−$1,962,384|−$142,531|
| Controlled staffing, no new expansion |120|Ongoing|$3,685,394|$9,515,964|$10,478,126|$72,980|
| Controlled staffing, paid expansion |32|Receivership|−$20,555|$6,705,324|−$2,087,806|−$71,716|

At120, the cautious bank has$45,017,943 deposits,$26,003,873 cash and9 employees;
its loan book is roughly its original$9.5M, not sustained lending-led growth.
Its monthly commercial service income is$234,499, versus$53,749 loan income and
$68,664 securities interest. The ordinary rival also remains profitable, but
holds only$2,588,770 loans. The result supports a viable mixed bank in this single
Balanced seed, not pure-lending profitability, optimal expansion or comeback
balance across scenarios. Rate Shock still has only the shorter24-month evidence.

The extended run has already overturned the24-month survival impression: the
paid-expansion arm fails through receivership at32. At the shared month23,
controlled expansion had$8.65M loans versus$7.78M without expansion, but monthly
operating expense was$204,651 versus$168,205. Payroll was$132,000 versus$96,000;
office upkeep$44,000 versus$26,400. Other costs differed too, so these are not
isolated unit-cost estimates. The cautious bank's profit also included commercial
service and securities income; survival does not establish a self-supporting
pure-lending strategy. The player guide now explains cash/capital, recurring
costs and loan-book replacement as separate expansion checks.

Actual browser follow-up completed a normal new Expanded month, dismissed the
result, reloaded and continued at cycle2 with no console errors. The temporary
test tab and local server were closed; the user's own tabs/saves were untouched.

**Superseded local package:** `BranchWars-V4-stabilization68-20260914` and its ZIP
are preserved, but should not be used: their bbe49017 portable has the funding
terminal-validation defect above. The user was told to hold off. Deliver the
correction under a separately named68b package; do not overwrite that shared ZIP.
Physical two-computer acceptance remains open; the user has confirmed that two
computers will be available, which is not a completed test.

**Corrected local playtest:** `BranchWars-V4-stabilization68b-20260914` and its
matching ZIP contain portablea3c293cf. The six ZIP entries match the packaged
bytes and content manifest. ZIP SHA256
`c9850733604cbecf5a6167884f53501186b92976d9760c7d81841463692a032c`.
No private saves, credentials, reports or development sources are included.
Both computers must use68b for this acceptance session. GitHub-room, LAN and
direct-link simulated pairs were rerun on this corrected build and pass
old-peer refusal, two months, half-ready recovery, private records and delayed
frames. The complete Windows gate is still separate and pending.

#### Two-computer GitHub-room acceptance for68b

Use a fresh test room and keep the previous real campaign exported and separate.
Each person uses their own repository credential; never include a token in a
bug report. Both use the68b package above, not a mixture of published V4 and this
local candidate.

1. Configure distinct names/colors in the lobby. Apply a host settings change
   after readiness, check readiness clears and the guest cannot edit host rules,
   then confirm both seats before starting Expanded.
2. Complete two months. Check names/colors remain consistent on both screens,
   each person controls their own bank, and both reach the same month. Different
   private bank information is expected; the rival must not reveal hidden plans.
3. Host exports a backup. In the next planning month, lock only the host's plan,
   disconnect/reopen the guest and use the existing room's recovery flow. The
   locked plan must not resolve twice or become the other player's plan.
4. Finish that month, export again, then reload the host and resume the same
   room. Check the guest reconnects to the same bank and the completed month is
   neither replayed nor lost. Resolve one more month after recovery.
5. Record build name, transport, last agreed month and the exact failing step,
   or report all steps passed. Keep exports private. One successful session is
   sampled acceptance, not a guarantee against every network failure.

Previous runtime packages, their ZIP and frozen releases remain untouched.
No commit, push, tag or release was made in this checkpoint.

### Preserved checkpoint67 workflow stabilization

September 14 local playtest, not published or committed. Portable SHA256
`b2d142794189932a0355d881f55d7e6b7ffb164203393b800921c16be76cc63b`;
engine SHA256 `bb2b38b8ebb8fa10eb73f5cf2f64ffc834c67a170e2864165029a8fd86bc7d79`.
Core8.19 / Expanded9.32 remain fixed; 200 source inputs. Frozen rc2 and all
historical references remain unchanged.

- New human Expanded starts and rematches explicitly reserve finite starting
  credit and commercial work. Existing saves and legacy raw creation/rematch
  defaults remain unchanged. Zero production remains a valid manual choice.
- This month opens the same executive, staffing and department controls inline,
  without a second draft. Work warnings lead to the relevant task. People shows
  the shared employee-time reconciliation; forecasts show the consequences of
  credit/relationship coverage. Core uses a flat six-workspace navigation row.
- Loan movement separates ordinary originations, named advances, repayments,
  collections and losses, with actual/forecast/unavailable labels. It does not
  claim to be the whole-month bridge including later asset trades and awards.
- Recovery projections no longer subtract already-included department,
  leadership, maintenance and facility-work costs twice in current Expanded.
  Actual accounting settlement and reserve thresholds were not relaxed. AI
  submissions receive applicable human-plan validation; a failure restores the
  human lock and RNG. Reserve quoting is memoized only within one fixed context.
- The historical payable test uses byte-verified pinned sources rather than
  requiring an unavailable Git object in a source archive. No goldens changed.

**Verification complete for this local playtest, across recorded runs:** nine
dedicated workflow tests pass. The initial
20:21:42 full run found an isolated renderer test missing campaign-context globals.
Its failed/incomplete journals remain under
`reports/baselines/gate-2026-09-14T20-21-42-435Z-b0d95fd6-9161-4025-a3bc-e2a92602dc98`.
The fixture now supplies that context; no gameplay bytes or assertions changed.
The engine suite then passed, including 48 legacy long campaigns. A fresh full
Windows gate began at 20:42:58 UTC, journal stem
`reports/baselines/gate-2026-09-14T20-42-58-436Z-3b0f515a-f305-4e30-9181-572d5ef1df4a`.
It is not a clean terminal pass. The sweep finished at 21:44:17 UTC with 208/211
checks passing initially. Its three failures were: an isolated department UI
harness missing the new module; the prior integration-engine review pin; and a
historical lifecycle reference incorrectly following the mutable V4 release
folder. The harness was repaired, the review pin advanced only after independent
replay evidence, and the lifecycle test pointed at the exact preserved
checkpoint65 bytes without changing its checksum or expected behavior.

All three now pass in the clean 11-command repair-validation receipt. The sweep's
before/after inventory confirms that only those three test files changed; game,
engine, launcher and historical reference bytes did not change during the run.
Repeated seeded balance output matched exactly, and Windows LAN checks passed
health, room creation, vacant-seat authentication, malformed-message rejection,
join, relay and retry deduplication. The original full gate remains failed and
incomplete at 3/37 top-level commands; it was not retrospectively relabelled.

The verification index (local evidence: `game/output/v4-workflow-verification.json`) reconciles all
211 sweep checks with their passing reruns and all 37 top-level command groups
with the independently completed receipts below. It verifies the final input
inventory and package hash. **This is complete command coverage across runs,
not a pristine all-in-one full-gate pass**, subjective balance approval or a
physical two-computer certification. A clean standalone gate remains desirable
before a later production release; no publication is authorized here.

| Evidence | Terminal result |
| --- | --- |
| Broad sweep (local evidence: `game/reports/baselines/N-00-2026-09-14T20-42-58-955Z.json`) | 208/211 initially; three repaired test issues retained as failures |
| Final repair validation (local evidence: `game/reports/baselines/workflow67-repair-validation-2026-09-14T21-32-21-782Z-803f6b0c-5f03-4e13-81f3-8289d654eae2.json`) | 11/11 commands; unchanged inputs; includes all three failed checks, the engine/48 long campaigns, nine workflow regressions, payable fixtures, architecture and documentation |
| Release-balance and compatibility supplement (local evidence: `game/reports/baselines/workflow67-final-supplement-2026-09-14T21-18-35-321Z-a5115795-2781-4876-acd0-a4f96add6f4e.json`) | 8/8 commands; unchanged inputs |
| Remaining release checks (local evidence: `game/reports/baselines/gate-2026-09-14T21-18-59-363Z-d4ca3702-8175-449b-a980-6110731ba09d.json`) | 30/30 commands; unchanged inputs; explicitly a partial run |

The lifecycle rerun includes 1,387 creation and 41 migration comparisons. Both
final strategy trials have also completed, with results and limits below.

The final workflow audit (local evidence: `game/output/v4-workflow-final67/report.json`) preserves
four exact prior/current Core/Expanded seeded comparisons across three months
each, including plans, world and RNG. Median time for two AI plans across three
repeats changed from 1,960 to 1,762 ms at opening, and 13,586 to 12,024 ms at
month 121. These shared-machine measurements suggest about 10–11% improvement;
they do not establish instant mature-game response. Sampled action removal was
in recovery, including its operating-loss stress test, not a new spending floor.

**Actual browser checks:** fresh Core and Expanded human games, inline executive
decisions, credit zero-production preview/adopt/restore, monthly resolution,
Continue after reload, and a preserved month-121 import were exercised. Mature
People, selected-office staffing and a signed commercial-client inspector were
inspected. Layouts were checked at 1280×720 and 760×800; the inspected narrow
pages had no document horizontal overflow. Keyboard office quantities and reset
worked without leaving Markets. No final browser console errors were observed.
This is sampled workflow coverage, not every panel/viewport or human enjoyment
acceptance. No real two-computer session was run.

A further actual hotseat workflow imported the month-121 snapshot, staged a
Full-Service Financial Center in Industrial Corridor and a Commercial Banking
Office in rival-held County Seat, sealed both players' plans, and resolved two
normal months. Both projects completed in their respective destinations at
month 122 close. The new commercial office received the normal establishment
window, not free share. Its extra 0.25 Operations employee-month was initially
rejected because the shared pool was full. Removing 0.25 from the existing
Industrial Corridor ATM and assigning it to County Seat produced an eligible
review and a staged lifecycle plan, all within Markets. This directly exercised
finite staffing, retained multi-location orders, hotseat handoff and the existing
office inspector. No extra people/cash were injected and no console errors were
observed. The final staffing transfer was staged, not subsequently settled in
this browser sample; automated lifecycle tests cover settlement.

**Local package:** `BranchWars-V4-workflow-playtest-20260914` alongside the source
repository contains the verified six-file runtime allowlist with the portable
hash above. It excludes private saves, tokens and development reports. Publication
requires a subsequent request. The verification index records terminal receipts
and the matching ZIP/package identity. No commit, push, tag or release was made.

ZIP SHA256: `cfb7744be5543ee2686bd21fbc6ce861121c273c5f15a1e18256f6a4d55b2b97`.
The ZIP was extracted into a separate check directory and all six allowlisted
files verified again. The payable fixture also passed all 13 checks in a separate
source-only directory with no Git database. An initial incomplete copy lacked
the four current accounting sources; supplying those normal test inputs fixed
the test setup, not the accounting implementation.

#### Comparable strategy evidence, not a claim of optimal play

The final Balanced trial (local evidence: `game/output/income-banking-workflow67-final-balanced/report.json`)
and Rate Shock trial (local evidence: `game/output/income-banking-workflow67-final-rate/report.json`)
use the same final engine, different scenario/seed pairs, and validate each plan
and settled accounting bridge. Intentional lending/commercial policies preserve
existing work, defer new research/discretionary projects, retain at least two
Operations employees (or the ordinary AI's greater allocation), distribute the
remainder toward Lending/Business respectively, and use the same paid hiring
and commercial-office rules with a $600K cash plus six-month incremental-payroll
buffer. Protected service changes must be legal and improve the quoted economics.
These are bounded policies, not optimized strategies or an isolated test of only
one department. Recovery can make a labelled lending bank Operations-heavy.

All arms can be compared through month 23, when the Balanced lending arm entered
receivership. Figures below concern the controlled bank, not the rival. Cumulative
operating profit is not retained earnings or the change in cash.

| Scenario / policy | Month-23 loans | Month-23 equity | Operating profit, months 1–23 | Staff: Retail / Business / Lending / Operations |
| --- | ---: | ---: | ---: | --- |
| Balanced / ordinary | $5,441,242 | $1,856,324 | $467,989 | 4 / 1 / 2 / 2 |
| Balanced / lending | $3,656,962 | −$349,876 | −$1,962,384 | 1 / 1 / 1 / 7 |
| Balanced / commercial | $4,294,669 | $1,473,717 | −$901,432 | 1 / 4 / 1 / 5 |
| Rate Shock / ordinary | $3,025,213 | $1,234,915 | −$224,742 | 4 / 2 / 1 / 2 |
| Rate Shock / lending | $7,979,172 | $1,213,715 | −$958,150 | 1 / 1 / 3 / 4 |
| Rate Shock / commercial | $4,498,224 | $1,323,988 | −$937,766 | 1 / 1 / 1 / 8 |

The Rate Shock arms all survived month 24, but the lending bank still lost
$114,826 operating profit that month despite its $8.00M loan book. More lending
does not automatically pay for payroll, servicing, premises, funding and losses.
The Balanced lending failure is a real weak-policy/viability finding, not a
validator crash; it must not be counted as completing 120 months. No scores,
loan yields, company catalog, capital safeguards or subsidies were tuned to
improve these results. Broader viable strategy coverage remains unfinished.

Final Balanced outcomes: ordinary AI completed 120 months with $2,226,399 bank
equity, $2,712,966 loans, five employees and $162,068 last-month operating profit.
The lending policy lost in receivership at month 23. The commercial policy won
at month 82 with $7,184,226 bank equity, $9,752,170 loans, 15 employees and
$282,990 last-month operating profit. This is 225 actual Balanced campaign-months
plus 72 Rate Shock campaign-months, not six completed 120-month campaigns. Every
settled month passed the trial's plan, accounting and ledger checks. Both trial
reports have `running:false`, no execution failures and closing snapshot hashes.
The engine's consolidated closing report (not bank plus parent equity added
together) gives controlled group equity of $2,803,299 for ordinary, −$349,876
for lending and $7,339,531 for commercial. All three consolidation residuals
are zero; reading these reports preserved the saved states. Parent investment
in the bank is eliminated, so it is not an extra asset counted twice.

**Endgame pacing remains a design limitation:** the commercial terminal record
is `buyout`, presented as BANK CONTROL VICTORY, with eight stalemate months and
two months of buyout pressure. The rival still had positive equity ($2,066,843)
and operating profit ($92,258). This is the existing automatic control-result
rule, not a newly funded purchase or completed financial merger. Both final
books remain separate, with no free asset/customer award. Thus open-ended here
means no fixed turn limit, not guaranteed perpetual rivalry. Changing that
approved ending behavior is outside this focused workflow pass and deserves an
explicit game-direction review; do not count an early victory as 120-month
survival or quietly revive it for a prettier benchmark.

### Published rc2 / prior integrated repair: September 14

The normal portable now has SHA256
`ac5753947ebbc9106c4fff5df2c0fcd893476826b52c202c477bade61e288f92`.
Engine bytes remain
`b5e431190d86109aaa4a3fc6dd6a47ddd0d5b5a4557bec107f1ba95857641642`;
Core8.19 / Expanded9.32 rules and199 assembly inputs are unchanged.

- Repaired the actual legacy service-workspace crash: old agreements without
  company profiles now have an honest market/client label in the directory,
  inspector and reversible bid review. No company books or preferences are added.
- Integrated recorded funding components into Bank forecast. Organic growth is
  not whole-bank deposit movement; missing competition history is not zero.
- Four legacy-service, three funding and eleven income-UI checks pass on this
  exact portable, as does the engine suite (including its48 legacy long campaigns).
  Investment selector checks now render unopened and funded active controls;
  service tests exercise current workspaces and actual disclosure retention,
  rather than requiring removed headings or a particular local variable name.
- The324-turn service suite also passed on this exact portable, with47 ownership
  changes. A full exact-build release pass remains required. Browser appearance
  and physical multiplayer are unverified.

Frozen regression receipt:
`reports/baselines/N-00-2026-09-14T12-00-25-815Z.json`.
It finished at13:08:51 UTC with208/210 checks passing, unchanged sources and
reproduced seeded baseline output. `engine.test.js` and
`service_expansion.test.js` failed. The central gate stopped after3/34 commands;
its remaining commands did not execute. The receipt is retained as failed, not
relabelled after these repairs. No old reference fixture, release or remote state
was replaced.

A targeted continuation of the remaining income/workforce/network checks began
at13:16:07 UTC on`ac575394`, journal stem
`reports/baselines/gate-2026-09-14T13-16-07-448Z-a3102ffc-c81e-41e2-b0a3-6b0edc595037`.
It starts at`tests/legacy_services_ui.test.js`; it is explicitly a partial gate,
not a re-run or replacement of the failed full receipt. It finished at13:22:00 UTC:
21/21 commands passed, incomplete=false and sourceUnchanged=true. The frozen
targeted run is complete; subsequent publication documentation is separate.

**V4 publication checkpoint:** the user authorized GitHub V4 publication on
September14. The same playable bytes are packaged as `v4.0.0-rc2` on
`release/v4-playtest`, with updated quick-start and explicit known limitations.
See the [V4 package notes](../../releases/v4-playtest-notes.md) and
[package verification](../../releases/v4-verification.json). This is a playtest,
not final blueprint acceptance. V2/V3 and the prior V4 tag remain preserved.

The [cautious franchise trial](../output/income-banking-franchise-balanced66/report.json)
completed24 actual Balanced months against ordinary AI in212,971ms on frozen
`e056eeab` / the unchanged engine. Closing snapshot SHA256
`0744be4495a03407ddf317049c4cf3294caca46c4e61794f731d351accb161bf`
and campaign/accounting validators pass. Controlled/rival capital was$960,675 /
$2,172,170, retained earnings−$939,325 /+$172,170, loans$5,420,032 /$4,360,436,
cash$9,375,531 /$15,258,894. The controlled bank retained eight employees, morale72
and deposits$28,742,888. This improves funding survival relative to the earlier
failed Lending policy but does not establish lending viability. All actual hire
orders were zero; the trial helper's optional-hire guard does not constrain an
inherited AI hire. Do not reuse it as a universal hiring policy without repairing
that separate experimental limitation. No balance formulas were changed.

The preceding [paired single-month audit](../output/franchise-allocation-audit66.json)
preserves12 reconciled outcomes and its rejected experimental plan, which removed
a banker still needed for an existing bid. A
[three-case follow-up](../output/franchise-allocation-balanced66.json) preserved
that commitment. These are15 completed comparisons, not a clean pass of the
initial script and not long-term balance proof.

### Release-runner stabilization

The current desktop test launcher now invokes the central full gate instead of
bypassing its newer suites. Baseline subprocess timeouts increase from ten to
thirty minutes because a previously measured staffing test took 16.6 minutes;
assertions and historical goldens are unchanged. Central and baseline runners
retain incremental evidence, captured output and terminal receipts. A missing
receipt is not success. The central runner also rejects changed source/test/tool
inputs during execution. Local CI configuration now retains these evidence files.

Four runner safeguards, architecture checks, syntax checks and a one-suite
end-to-end partial run passed on September 14. That partial receipt identifies
portable `e056eeab` and unchanged inputs; it is **not** the full Windows gate.
No gameplay rules, frozen package, manual or remote state changed in this repair.
The next integration run must retain its own final receipt before being called
passed. Long strategy comparisons and human acceptance remain separate gates.

Fresh full Windows run launched September 14 at12:00:25 UTC, central journal stem
`reports/baselines/gate-2026-09-14T12-00-25-357Z-f3f33e9e-8eae-4193-a832-1b7743dcc55d`.
It entered the preserved baseline suite after passing portable/reference freshness.
It is now terminal and failed, as detailed above. The source freeze was released
only after both runner processes exited and terminal receipts were written.

Live protected-servicing strategy checkpoints are still **not terminal results**:
Balanced Business reached month76 (capital$7.07M, retained earnings$3.86M);
Rate Shock Business reached month64 (capital$5.01M, retained earnings$1.83M).
The corresponding Lending arms ended at23 in receivership and44 in buyout;
Rate Lending closed with negative capital. None of these failures was revived.
Both continuing Business arms now earn substantially more commercial fees than
loan interest. This strengthens the need to assess net strategy viability and
causes of failure; it does not establish that the conventional lending franchise
is balanced. Exact progress remains in the two `income-banking-serviced-*-120`
continuation reports identified below (folder names end in `120-66`).

Rate Lending's preserved trajectory narrows the interpretation: both deliberate
strategies buy commercial offices under the same diagnostic policy, not a
lending-optimized network. By month12 the Lending arm had three offices, roughly
$63K monthly premises upkeep and$113K base payroll, versus$52K loan interest.
At month24 its relationship coverage fell to zero while cash was$1; protected
vendor purchases were refused. Near failure, inherited crisis staffing reserved
seven/eight of ten employees for Operations, leaving zero/one in Lending.
At month44 commercial fees were zero and loan interest about$41K against$195K
operating expense. Accounting still reconciles. These are observed strategy and
cash/servicing constraints, not proof of an incorrect yield formula or an optimal
conventional-bank test. Do not silently change this captured policy on resume.

**Terminal update:** Balanced completed with exit0 in1,084,216ms. Lending remains
ended at23; Business ended by buyout at82 after58 additional months. Its two
banks close with capital$7,184,226/$2,066,843 and retained earnings
$3,968,726/$66,843. Both hold three controlled markets; stalemate8 and pressure
`[2,0]` confirm another solvent-ending case, not conventional-bank failure.
The Business closing snapshot SHA-256 is
`3e89680208ec85ef73b8b7dc5c621af551a0fd00af6b72e9cff6e1bf4c2fd0b0`;
both closing snapshots match the report and validate on its captured engine.
This is not a120-month pass. Rate's continuation remains separate and live.

**Read-only production attribution:**
[nine candidate-plan comparisons](../output/income-capacity-audit66.json)
on captured Rate opening and after24-month states delegate to the unchanged
production function. Each forecast exactly matches the uninstrumented engine,
with unchanged actual world/RNG after AI plan selection. AI selection itself
normally consumes randomness; the first diagnostic mistakenly included it in
the purity boundary, then corrected that boundary before producing this report.
No gameplay purity defect was inferred from that diagnostic mistake.

At opening, Lending's$400,000 site ceiling is slightly below$409,627 scheduled
principal repayment, despite three effective sales staff and full credit
administration. After24 months, its Lending plan has2.25 effective sales staff,
full administration,$738,071 site capacity, but only$380,952 effective production;
projected net principal growth is$72,104 and profit−$37,156. Moving to Business
on that same state instead forecasts$16,067 profit but shrinking principal.
These are candidate-plan forecasts, not actual outcomes or the formal UI's
unchanged-standing-policy comparison. They identify binding limits; they do not
establish that any arbitrary throughput multiplier or yield increase is safe.
Next strategy diagnosis must include existing product terms and shared servicing,
not repeat an employee-count-only claim or silently alter the live trials.

**Mortgage-heavy follow-up completed24 actual months:**
[the captured product-mix comparison](../output/income-banking-mortgage-rate66/report.json)
uses diagnostic trial version4, not a new saved-game version. The playable9.32
engine and initial Rate Shock/seed2 state exactly match the preserved serviced
Lending trial. Only new-production allocation is deliberately changed to50%
mortgage/25% middle-market/25% small-business before productivity weights;
existing borrowers are not refinanced. The prior shared staffing, paid hiring,
office expansion and service-protection rules remain. Later rival choices and
events may diverge, so this is not an isolated realized-return attribution.

All24 settlements pass plan, ledger, statement and cash/loan/earnings-bridge
checks. The run exits0 in223,920ms. At month24 the controlled bank has
$8,569,637 loans,$970,953 capital,−$1,179,047 retained earnings and$1 cash;
the previous mix had$8,003,854 loans,$1,084,669 capital,−$1,065,331 retained
earnings and$1 cash. Last-month interest improves from$46,363 to$48,866, but
serviced commercial fees are zero in both. In the new trajectory, deposits fall
from$25.25M at12 to$18.25M at24 while new organic inflows fail to offset wider
outflows. Product terms alone do not solve this funding/service squeeze.

Captured driver SHA-256:
`f5ea00b43aa37aa595088b77eb6efc6a6620cbc812415a47474a6d09c14de26c`.
Closing snapshot SHA-256:
`d2db3ad50a670294570269338aed60d0dcbeadccbf2c3d2448fcd5f612bc35c6`.
The closing snapshot hash and saved books validate. Continuation
`output/income-banking-mortgage-rate120-66/` was launched against the same
captured policy and engine; it is pending, not a120-month pass. No playable
coefficient, current AI, historic save, frozen release or GitHub object changed.

**Protected-servicing Rate continuation completed:**
`output/income-banking-serviced-rate120-66/` exits0 after2,107,615ms.
Business completes96 additional months for120 actual months, still active;
Lending ends at44 with negative capital and is not revived. Both final snapshots
match their receipts and validate against the captured engine. All resolved
months pass the accounting/statement/causal-movement checks described above.

| Rate Business game at120 | Controlled bank | Ordinary rival |
| --- | ---: | ---: |
| Capital | $6,311,802 | $3,038,032 |
| Retained bank earnings | $3,031,802 | $588,032 |
| Cash | $42,599,772 | $11,968,723 |
| Loans | $12,706,345 | $3,336,318 |
| Deposits | $63,315,743 | $27,090,562 |
| Employees | 26 | 6 |
| Last-month loan interest | $72,711 | $18,107 |
| Last-month commercial fees | $512,611 | $355,885 |
| Last-month operating profit | $66,244 | $284,607 |

Neither bank has emergency debt. The high-fee result remains distinct from a
viable interest-led conventional-bank result; hiring/expansion also means the
larger bank is not uniformly more profitable. Cumulative operating profits
($15.91M/$10.77M) are not retained earnings and exclude other equity movements.
Business closing snapshot SHA-256:
`a83fd69692b275c31a8f1279698446e70846530f0463daf87eb171314396c315`;
Lending closing snapshot:
`c47e5a0fb32526eb603d930a3f8c71516d2da238f4a2bf6dea8dc2485caa5cf5`.

Selected long-horizon stress continuation
`output/income-banking-serviced-rate480-66/` is launched from this exact state,
policy and engine. It targets480 without reviving the failed Lending game or
changing campaign endings. It is pending, not completed stress evidence.

**Terminal continuation update:** both continuations above have now exited0,
with validated closing snapshots and no recorded accounting/execution failure.
Mortgage-heavy Lending ended by buyout at47 after23 additional months, with
capital−$378,824/$1,644,984; elapsed359,505ms. Closing SHA-256:
`c7044ad3b02d106b42f4af6e0b95ccf2b9502df3f30f7e56ea6e676967c5f7fa`.
The Rate stress attempt ended at130 after10 additional Business months;
elapsed205,499ms, capital$6,644,657/$2,413,109. Closing SHA-256:
`58f1c7f683a03862e25870e2c8faeb94b2ee3e6090efc6214312585c8bc3bcf5`.
Both last two plans chose `competitiveAction: none`; stalemate2/pressure`[2,0]`
identifies the automatic settled-buyout route, not the eight-month mandated
auction or a funded player takeover order. These are early endings, not120/480
passes. No further identical continuations are launched while this policy
decision remains unresolved.

**Preserved funding-only review evidence (subsequently integrated above):** eight checks pass
for `output/funding_movement_ui_candidate66.js` and its adjacent test. It uses
existing validated owner events, labels missing competition history unavailable
rather than zero, and separates recorded components from total deposit change.
Core is tested without enabling Expanded; mature Expanded retains a usable
competition record even when its opening marker has been pruned. Stale owners,
periods, private-event inconsistencies, duplicate records and invalid amounts
fail closed. This is presentation logic, not a network authenticator or a new
saved projection.

The locally retained isolated review (`output/funding-review66/BRANCH_WARS.html`)
placed this disclosure below the existing bank income statement. Its local
identity receipt (`output/funding-review66/manifest.json`) records preview
SHA256`61187c94fb6e9b2e020d7305809673988890b4f988310f6ff55247fffd36ff5d`;
the original portable remains
`e056eeab470d3f41e68ff12e1a93d28a085e7fa0b0547f60d217043dae6cc1f1`,
and engine bytes remain identical. All15 checks in
`output/funding_review66_integration.test.js --portable` pass: four preview
integration checks plus the unchanged11 existing income-UI tests executed on
that same artifact. Early and mature actual projections render their recorded
amounts without changing game state or drafts. These simulated-renderer checks
are not visual acceptance or live multiplayer testing. Integrate into canonical
source only after the current frozen-source regression finishes, then verify
the resulting exact candidate. No release or remote artifact was replaced.

The [supporting deposit-flow audit](../output/deposit-flow-audit66.json) verifies
all24 monthly deposit and cash bridges on the preserved mortgage trial. At18,
the operating report's organic flow is+$66,234, but the actual operations stage
is−$120,721 after its other customer flows, and competition is−$591,116.
Together they reconcile to−$711,837 total deposits. The candidate deliberately
does not mislabel organic flow as that total, nor invent rival/outside-provider
subtotals within the combined competition stage.

| Artifact | Identity | Status |
| --- | --- | --- |
| [Frozen V3 player ZIP](../../releases/branch-wars-v3.zip) and [matching manual](https://github.com/NerdyGeneral/BranchWars/blob/v3.0.0/releases/branch-wars-v3-manual.pdf) | Published-snapshot lineage: save9.5 /134 assembly inputs | Preserved distribution; not the newest development work. Local hashes still match the frozen report. |
| [Local playable HTML](../BRANCH_WARS.html) | Checkpoint66; normal Core8.19 / Expanded9.32 | Matches the V4 rc2 package. Reporting and economic corrections are selected by the existing edition buttons. Not a full release gate pass. |
| [V4 rc2 playtest package](https://github.com/NerdyGeneral/BranchWars/blob/v4.0.0-rc2/releases/branch-wars-v4.zip) | Checkpoint66 / Core8.19 / Expanded9.32 /199 inputs | September14 playtest update; previous V4 is preserved at the rc1 tag. |
| [Current source](../src/manifest.json) | Checkpoint66 /199 inputs; normal Expanded starts9.32 | Integrated reporting, serviced income, credit workload, payroll and Core funding corrections. Balance and release gates remain open. |
| [Checkpoint65 review artifact](../reports/reference-builds/BRANCH_WARS_expanded65_review.html) | Preserved integrated Expanded lending /193 inputs | No longer matches current source. Not a final player release or full gate pass. |
| [Checkpoint64 review artifact](https://github.com/NerdyGeneral/BranchWars/blob/d795660/game/output/BRANCH_WARS_creditrival64_review.html) | Preserved company-credit rival workflow /193 inputs; no longer matches current source | Developer review artifact; company lending here still requires explicit9.28 creation. Not a player release or full gate pass. |

The existing published PDF matches the frozen V3 package; it is **not the comprehensive manual for V4**. Historical archive/tag/publication statements describe their original checkpoints; the September14 V4 publication is recorded above.

### Local development handbook — not a published replacement

The locally retained development handbook
(`output/pdf/branch-wars-development-handbook-ce11f7ca-r3.pdf`)
rendered an earlier player-guide revision for Core8.19/Expanded9.32 in the original
period-inspired manual style. Current setup uses the two editions; obsolete
individual-preview setup and historical victory/facility rules are appendices.
Navigation and the available investment-services desk are corrected against source.
It predates the latest funding/legacy-service UI repairs and is not published as
a current V4 manual. That editorial pass did not change rules, prove all content complete, or close
the unresolved long-game ending/balance decision.

- PDF SHA-256: `c83133cdca25de3c0e3088ea8268dd940173625c0dc776b69b0a029fd411f628`.
- Runtime: `ce11f7ca1c9994bb0a2fc9c702e54916ac16d3da1bd96b4994959aed1d1da153`;
  guide: `3cb1311f39c272c3ecb6c2d40aa641e1c4d844e5211ef5c6c93d30abda7fa571`.
- 56 pages rendered; all contact sheets inspected, with full-size inspection of
  navigation, qualified agency staff, reconnect instructions and the historical
  capital table. No text-boundary overflow detected. Poppler emitted two fallback
  font warnings; the inspected output showed readable glyphs, not missing symbols.
- 49 guide sections and bookmarks,98 internal link targets, source-word coverage
  and all three fingerprints verified. Five builder safeguards pass; they are
  documentation tests, not gameplay tests. Rendering evidence is in
  `tmp/pdfs/development-ce11f7ca-r3/verification.json`; the PDF has an adjacent
  source-manifest JSON. Earlier local draft layouts are retained as non-current.
- Frozen V3 manual SHA-256 remains
  `b577325f9c4fd34a2e73a3feda41acd47dc4e0ecd7b2b3c3dfec568cb5b9e1ed`;
  V4 package/runtime hashes remain unchanged. No GitHub operation occurred.

The guide/runtime have since changed for the servicing shortcut below; this
preserved handbook needs regeneration at final freeze. It is local
review material, not the final release manual or an additional gameplay gate.

### Commercial servicing shortcut and causal diagnosis

Current portable SHA-256:
`e056eeab470d3f41e68ff12e1a93d28a085e7fa0b0547f60d217043dae6cc1f1`.
Engine SHA-256 remains
`b5e431190d86109aaa4a3fc6dd6a47ddd0d5b5a4557bec107f1ba95857641642`.
No simulation formula, AI policy, save marker or historical fixture changed.

The commercial income panel explains missing service and opens the existing
relationship editor (Expanded) or Business allocation (Core). It performs no
purchase or automatic reallocation. Old owner/month/campaign callbacks refuse;
unreviewed department edits are not discarded. Department task descriptions now
identify recurring fee coverage only in campaigns that actually use those rules.
Eleven income UI tests pass against source and the rebuilt portable, including
the real navigation/controller path, not just a mocked click;16 live department
checks preserve older Group4/5 behavior. Portable assembly/build, architecture,
documentation and generated reference checks pass. Visual acceptance and
the full exact-candidate gate remain outstanding.

Replaying the captured Balanced Lending policy to month6 reproduced zero
relationship service. The diagnostic rebuilds work after the ordinary AI's paid
servicing pass, so its strategy is not equivalent to the original protected AI.
A pure comparison buying two existing vendor work units costs $6,000 and changes
forecast fees from $0 to $82,896, operating profit from -$116,390 to -$39,494 and
capital ratio from10.049% to10.677%, without forecast funding loss or emergency
debt. These are forecasts, not realized returns. Full plan spend is $14,800;
the AI's additional capital reserve makes its spending limit zero, so its
servicing helper refuses even this improvement. State/plan purity was verified.
This exposes an adaptation limitation and an overexpansion tradeoff, not proof
that loan yields are wrong. Preserve the failed24-month outcomes; evaluate a
service-aware, cash-funded strategy separately before any new-version tuning.

## Income checkpoint66 — in progress

The checkpoint begins from clean tracked commit `7703a207a748e7b2e8898a466f45093344365de0`
on `release/v4-playtest`. Local diagnostic saves were preserved. No commit, push
or publication is authorized for this checkpoint. The V4 ZIP and its packaged
runtime remain frozen; the normal local HTML is a development candidate.

**Reference, not a game rule:** Frost's Q2 2026 statement separates GAAP net
interest income ($447.728M; taxable-equivalent $470.066M), non-interest revenue
($128.3M), operating expense and credit-loss expense. Its fees include account
services, trust/investment management, insurance and card activity. Use the
GAAP/tax-equivalent distinction explicitly; deposits and assets under management
are not revenue. [Frost Q2 results](https://investor.frostbank.com/news-market-data/News-Details/2026/CULLENFROST-REPORTS-SECOND-QUARTER-RESULTS/).
JPMorgan's Q2 2026 managed presentation reports $25.6B NII and $32.4B noninterest
revenue and identifies significant items separately. It illustrates a different
business mix, not a target ratio for every institution.
[JPMorgan Q2 earnings filing](https://jpmorganchaseco.gcs-web.com/node/909756/html).
Both primary sources were rechecked September14 after the user supplied the
Frost link. Their quarterly results guide presentation, not monthly game yields:
keep earning-asset interest, funding costs, delivered fees, expenses and credit
losses distinct; separately identify investment gains and exceptional items.
Do not mix GAAP and adjusted measures or force the two institutions into one
revenue mix. The existing statement outline below remains the bounded scope.

### Service-aware comparisons — mixed outcomes, no AI adoption

On the unchanged `e056eeab` portable / `b5e43119` engine, the separately labeled
protected-service strategy completed its24-month targets except for one early
failure. `output/income-banking-serviced-balanced66/` and
`output/income-banking-serviced-rate66/` both exited0; all95 settled months
reconciled reports and cash/loan/earnings bridges. The Balanced lending bank
failed economically, not through a test exception.

| Scenario / controlled strategy | Months / outcome | Operating profit to date | Retained earnings | Closing capital | Closing cash | Closing loans |
| --- | --- | --- | --- | --- | --- | --- |
| Balanced / Lending | 23 / receivership | -$1.962M | -$3.157M | -$350K | $1 | $3.66M |
| Balanced / Business | 24 / active | -$888K | -$1.628M | $1.49M | $3.49M | $4.19M |
| Rate Shock / Lending | 24 / active | -$1.073M | -$1.065M | $1.08M | $1 | $8.00M |
| Rate Shock / Business | 24 / active | -$933K | -$1.752M | $1.33M | $2.87M | $4.35M |

The service-aware review was adopted4/9/2/8 times respectively. Its incremental
quoted supplier costs sum to $21K/$45K/$9K/$42K; these are not a claim about total
vendor expense or isolated realized ROI. Business-focused results improved
relative to the earlier policy, but all four retained losses and the lending
outcome remained fragile. Subsequent events and rival responses can diverge;
the23-month failure must not be compared as a complete24-month outcome. More
service coverage alone does not establish sustainable expansion or justify an
AI rule change. No salaries, yields, accounting or ordinary AI were retuned.

Captured driver SHA-256:
`4412ab02843f4f0d65368281b563bcb7b7e1788c3ffdeb4539a0cad35e50e188`;
service-policy SHA-256:
`97ebcfd59dfe8550d99c82e1ca8fc96ba35fee54eb239fae03ac4008e8ef8f73`.
Eleven policy safeguards pass, covering purity, current cash, finite vendors,
duplicate service, protected capital, new borrowing/losses and negative returns.
Version3 diagnostic resume retains its policy; covered startup months match the
earlier exact full state/RNG. This is not a changed saved-game version.

Through120 continuations are launched in
`output/income-banking-serviced-balanced120-66/` and
`output/income-banking-serviced-rate120-66/`. Inspect their terminal results before
claiming long-run completion. The failed Balanced lending arm stays ended at23;
it receives no rescue or artificial extra turns. Next evaluate expansion timing,
full sustaining costs and adaptation rather than automatically raising loan
yields or weakening capital protection.

### Paid banking comparisons — completed24-month diagnostics

`output/income-banking-cash-balanced66/` and
`output/income-banking-cash-rate-seed2-66/` completed with terminal exit0 on the
unchanged `ce11f7ca` portable / `b5e43119` engine. Each contains ordinary AI,
Lending-focused and Business-focused arms against an ordinary same-rule rival.
Balanced uses seed1; Rate Shock uses seed2. All144 monthly proposals were accepted
and every settled bank report and cash/loan/earnings bridge reconciled. This
does not mean every optional hire or office proposal was affordable or accepted.

| Scenario / controlled bank | 24-month loan interest | 24-month operating profit | Closing retained earnings | Closing loans | Outcome |
| --- | --- | --- | --- | --- | --- |
| Balanced / ordinary | $841K | $495K | -$17K | $5.18M | Active |
| Balanced / Lending | $1.004M | -$2.167M | -$3.132M | $5.02M | Buyout at24 |
| Balanced / Business | $778K | -$2.138M | -$2.845M | $3.63M | Active |
| Rate Shock / ordinary | $799K | -$257K | -$857K | $2.86M | Active |
| Rate Shock / Lending | $1.251M | -$1.196M | -$1.176M | $8.00M | Active; cash $1 |
| Rate Shock / Business | $914K | -$1.754M | -$2.920M | $4.10M | Active |

These are multi-decision policies, not isolated staff ROI or optimal play. Paid
expansion raised costs; some controlled banks lost serviced-fee income entirely.
Operating profit and retained earnings differ because other settled decisions
also affect earnings. More interest or principal is not proof of viability.
The terminal buyout is retained as an outcome, never revived for a longer run.
Investigate service coverage, expansion affordability and adaptation before
drawing a universal conclusion about conventional-bank viability.

The diagnostic's first buffer incorrectly treated cash/capital-limited remaining
spend as cash, imposing an additional $600K capital reserve. Two assertions
reproduced this; the corrected policy uses actual discretionary cash and added
payroll while retaining the game's capital checks. The earlier
`output/income-banking-balanced66/` results and captured driver remain preserved
but are not the corrected policy. No gameplay coefficient or save rule changed.
Corrected trial driver SHA-256:
`1ec1b3b697990b74f6bc24676d264aadf19188bae20db7123d3e1ecbcc119eca`.

Four focused policy tests pass. All three two-month full states, including RNG,
match uninterrupted versus saved/resumed play (`income-banking-cash-uninterrupted66`
and `income-banking-cash-resume-smoke66`). Resume support validates the captured
policy and engine before continuation. The old broad partial diagnostic reached
its final commercial-network command, but its terminal receipt was unavailable
after context recovery; it is not promoted to a passing full gate. Final exact
Windows checks,120/480 strategy coverage and human acceptance remain open.

**Reproduced baseline:** `output/economics-income-baseline66/` retains the exact
V4 engine, opening/closing saves, six-month snapshots and ordinary AI plans;
seed `business-balance:1`, Balanced, 12 completed months, no injected resources.
Runtime SHA-256 `1c488be30061e6729b56bc0a6bf81f838aec7dc039916284429509a06659df00`.
Bank 1 loan interest fell $49,574.88 → $28,420.97 while business/merchant fees
rose $68,112 → $84,460.80; ending loans $5,501,756 and cumulative earnings
−$214,227. Bank 2 ended with $27,637.56 loan interest, $84,355.20 commercial
fees, $5,313,826 loans and −$743,642 cumulative earnings. Month-12 operating
profits were positive ($26,478 / $14,745). This is one ordinary opening run,
not a strategy tournament or evidence of universal fee dominance.

**First reporting replay:** `output/income-replay66.json` verifies all 12 months'
AI plans, actual reports, balances, owner reporting purity, save history and the
entire closing campaign against that baseline. It records its exact candidate
hash; later UI-only edits require fresh candidate checks. No economic tuning
has occurred. Baseline source inspection identifies aggregate recurring
business/merchant fees, staff/upgrade income and immediate relationship fee
eligibility as audit candidates, not automatically approved cuts.

**Outstanding:** full sustaining-cost/activation attribution including subsidiaries,
versioned economic corrections if justified, multi-seed multi-strategy and
120/480-month testing, full Windows/release gate and ordinary/mature visual
acceptance. Browser policy denied the local review URL; no alternate route was
attempted. Simulated multiplayer checks are not a real two-computer playtest.

**First candidate evidence:** normal local HTML SHA-256
`f37eb9fd29efde694c6079c8e57821529caf338947873b7601b3639e868f0cca`.
`output/income-replay66-final.json` repeats the 12-month exact closing-state
comparison against V4 on these final bytes; largest report rounding residual
was $1.26 (display rounded upward), inside the engine's $2 tolerance. Fifteen
targeted income/Core/Credit UI tests pass. Fresh named-credit GitHub/LAN/direct
simulations and GitHub recovery acceptance pass on this candidate, including
three resolved rounds, three reloads and one lost response without duplicate
expense or resolution. The first broad `node tools/check.js` run stopped on a
pre-existing lifecycle-fixture mismatch: missing creation options name the
`companyCreditVersion` wrapper in V4's TypeError, not the old `customerDemandVersion`
wrapper. Only null/undefined comparisons now use the hash-pinned frozen V4
reference. All other legacy creation/error comparisons still use the original
fixture. The corrected lifecycle suite passes 1,387 creation and 41 migration
comparisons. The gate resumed from that suite; neither the initial failure nor
a partial resume is a full Windows/release pass. No golden was regenerated.

The Collections regression then found that the added income panel unnecessarily
required an additional DOM insertion method in older harnesses. The panel now
joins the existing HTML render before listeners are bound. Latest local HTML:
`b34d0ce882e9508e51792efb6e39e83e03eebd9fd8c9da0eec91bcf1d600dcb4`.
Fourteen targeted income/Core/Credit tests and the 96-month Collections suite
pass on those bytes. The broad diagnostic resumed at Collections; its passing
GitHub recovery result also identifies this exact hash. Earlier passing chunks
are evidence for their own build, not a single untouched full-gate result.

The next broad stop was `agency_ui.test.js`: the expected explanation of agency
inclusion had disappeared from the pre-existing Group balance-sheet details.
That disclosure is restored inside the existing collapsed section, clarifying
retained balances while closed and excluding agency cash from deposit funding.
Agency UI and the 14 targeted income/Core/Credit tests pass after this change.
That reporting candidate is
`cab4b81e8a5012b3b346e4e79e5b505a6dcef1bd49f3960a3904dbe446516f95`;
the broad gate resumed at agency UI and is not yet a complete release pass.

**Preserved initial reporting-boundary evidence:** explicit
`incomeHistoryVersion:1` creates Core8.16 or integrated Expanded9.29. Each bank
keeps twelve consecutive actual income/closing-principal/relationship records,
independent of event pruning. No new checkbox, automatic save upgrade or money
change was introduced. Ordinary setup still creates Core8.1/Expanded9.28 while
the new boundary finishes integration. Four engine tests cover Core14 exact
months, Expanded3 exact months, half-ready restore, exports, rematches, malformed
records and a bounded480-append domain test (not a480-month campaign). Six
simulated Core/Expanded pairs across GitHub/LAN/direct pass two months each,
reconnect, delayed-message and private-history checks; real old peers are refused
for the new boundary. Four income UI tests cover legacy/new reporting and gaps.
That initial reporting build SHA-256:
`547c9d26ddde2e73c55b4d2c756134b0ecb449e2b768b481e164c1696210af65`.
`output/income-replay66-history.json` additionally replays the preserved ordinary
Expanded12-month baseline on this exact build: AI plans and the complete closing
state match V4, with no economic drift (about88 seconds). The new reporting
boundary is tested separately; old campaigns acquire no new saved fields.

**September14 setup integration:** normal new Core/Expanded choices now select
the reporting marker, without a new control or a dependency wall. Legacy
two-argument engine creation helpers, imported campaigns and rematches keep their
original rules. Historical custom-selection proposals explicitly list removal
of an incompatible history marker; cancellation changes nothing. Current local
HTML SHA-256 is
`5309a5ef04b75922979c97baa2dbe5852e6c7b3ca32a23e41de45e49f52ed8df`.
Four edition tests, shared feature-setup/lobby checks, ten combined edition/
facility/income UI tests, six Core/Expanded history pairs (two months each) and
Expanded lobby/start/settlement across all three simulated transports pass.
GitHub resilience passes12 relay turns,68 accepted writes and9 lost responses
on this exact hash. History's four engine tests retain exact Core14/Expanded3
economics and RNG comparisons; an additional two-seed natural Core-ending test
retains the terminal month once, rejects another submission and resets history
on rematch. Build/reference freshness, architecture, local session transitions,
feature-network compatibility and77-document/603-link checks also pass.
These are scoped checks, not a full release pass
or physical two-computer acceptance. No economic formula or AI changed.
`output/income-replay66-setup.json` completes the same preserved12-month ordinary
Expanded replay against this setup build: exact AI plans, economic reports and
full closing state, in85,662ms. This confirms legacy replay, not strategic balance.

The broad diagnostic completed integrated staffing's four24-month scenarios and
exact Group7/8 replay, then advertising's controlled12-month comparison and the
commercial-account checks. It stopped at a stale current-Expanded UI expectation
of9.27; published V4 already creates9.28. That current-selection assertion now
expects9.28, while the same test retains explicit historical suite9.11 coverage.
The corrected suite passes; diagnostic resume begins there on the new source.
This remains a sequence of partial, identified runs—not a full unchanged-build
Windows gate. Architecture and current edition selection also pass.

### Servicing repair and joint investment evidence

`output/income-mature-joint66.json` records pure scenarios on the preserved
month120 closing save, source5309a5ef. Bank1 kept$218,256 monthly commercial fees
with3.132/3.132 relationship work served or0/3.132; Bank2 kept$210,864 with zero
or full3.029 work served. Paying four provider units cost$12,000 without improving
these fees. This is a reproduced missing gameplay consequence, not just a ratio.
Eighteen quoted conversion/staffing scenarios kept the same headcount and funding:
origination improved in several, but all existing60-month valuations remained
negative. These frozen scenarios neither executed construction nor established
an optimal network. Do not force the AI to buy a knowingly uneconomic office.

Explicit `commercialServiceVersion:1` now requires the reporting foundation and
creates Core8.17/Expanded9.30. Fees use opening-operation relationships and finite
delivered service; Core reserves existing Business time, while Expanded uses the
existing paid department task. No duplicate service charge, new customer book or
rate increase was added. A bounded AI proposal purchases missing provider capacity
only when current cash funds it, protected work remains intact, and net earnings
improve. Ordinary setup has **not** enabled this candidate yet.

The preserved servicing-only HTML was
`0033ac47f7c0c7571612916bdd05e2a22722cd965c4240710ac9ccf356372a17`.
Six commercial engine plus five income UI tests pass; six Core/Expanded simulated
peer pairs across three transports pass on this hash, including old-peer refusal,
two settled months, private reports, half-ready checkpoints, reconnect and delayed
frames. Historical Core8.16/Expanded9.29 creation, AI/RNG, resolution and both views
remain exact against the preserved5309a5ef reference. Missing new rule markers are
rejected rather than being treated as old Core saves.

Economic runs used the immediately preceding03cadec0 build; the final change only
tightened missing-marker validation. `output/income-core-serviced66.json` preserves
24 matched runs (three staffing tilts, four scenarios, two seeds, target120).
All reached24 months; one reached120,19 ended by buyout and4 by domination, with
no execution error. Mean24-month cumulative operating profits changed from
$3.604M to$3.292M balanced, $2.740M to$2.312M lending, and$5.072M to$4.593M commercial.
These are operating profits, not returns after all strategic spending. Commercial
staffing still leads: the servicing correction is not a completed balance pass.

`output/economics-serviced66/report.json` completes the matched ordinary Expanded
Balanced12-month start. Ending retained earnings are+$77,232/−$249,014 versus
−$214,227/−$743,642 before; both banks have full commercial service and no emergency
debt. Loans still contract to$5.414M/$5.184M versus$5.502M/$5.314M before. Same seed
does not mean identical decisions under changed rules; this is not causal proof
that servicing alone explains every difference. Lending/network unit economics,
broader strategies,120/480-month stress, final full gate and human acceptance remain.

### Credit administration: storage-granularity correction

The same preserved month120 banks hold$1,987,704/$2,059,206 of ordinary loans in
524/321 internal cohorts;491/290 rows hold less than$10K. The old formula needs
11.712/7.511 quarter-FTE of administration, dominated by row count rather than
principal. The new pure quote needs1.316/1.449 quarters using25/30 product/location
portfolios. These are quoted workloads on unchanged old books, **not** a save
upgrade, released staff or claimed future profit. Collections remains separate.

Explicit `creditWorkloadVersion:1` creates Expanded9.31 and requires serviced
income plus the existing complete Expanded foundation. It changes only the
administration workload representation: the principal factor is retained;
product/location portfolios and individual company claims replace ordinary
cohort count. It does not change coupons, term lengths, loan balances, arrears,
funding, capital rules or accounting postings. No record is discarded, and no
new checkbox/default is introduced.

Four targeted credit-workload tests pass, including a1,000-row split with
unchanged workload, finite shared staffing, pure forecasts, three settled months,
half-ready restore, rematch, strict metadata and exact old-rule replay against
the preserved0033ac47 candidate. Three new-rule simulated pairs pass across
GitHub/LAN/direct-link, including actual old-peer refusal, private views,
reconnect and delayed messages. Six income UI tests and setup/lobby checks pass.
These tests used7a3a8116907e1e29601b39f8d82c1af16fcbae50143fdd654291f9c34390f355.
The subsequent801286c2 build differed only by an explanatory source comment;
build/reference/docs/architecture checks pass on that artifact. Full release,
visual and real two-computer acceptance remain outstanding. The broader ongoing
regression resume remains a mixed-build diagnostic, not an exact final gate.

`output/economics-creditwork66/report.json` completed the ordinary Balanced
same-seed24-month run on7a3a8116, with preserved source/snapshots, no execution
failure and cash/loans/earnings causal reconciliation every month. Both banks
survived. At month12, loans were$5.472M/$5.221M versus$5.414M/$5.184M under the
servicing-only candidate; retained earnings were+$60,782/+$131,940 versus
+$77,232/−$249,014. Changed rules alter subsequent AI choices: these differences
are not all direct savings from administration.
At month24, loans had fallen to$4.303M/$3.146M from$9.5M each; loan interest was
$23,588/$16,903 versus commercial fees$125,280/$106,742. Retained earnings were
+$77,307/−$57,539 and cash$7.820M/$13.978M. The storage penalty is repaired, but
loan-franchise/branch economics remain unresolved. No coupon increase was used
to conceal that result. Longer strategic acceptance is required before default
enablement; this24-month result is not a120/480-month balance pass.

### Investment forecast repair and continuing verification

On the unchanged9.31 month24 bank,15 joint office/staff scenarios still have
negative60-month values. Separate **unsaved sensitivity experiments** at2x/3x
origination throughput also remain negative in the tested scenarios; no multiplier
was adopted. These keep the original lending policy and the existing frozen
valuation assumptions; they are not exhaustive strategy comparisons. Evidence:
`output/income-mature-creditwork66.json` and `income-mature-throughput2-66.json` /
`income-mature-throughput3-66.json`. Each records source/snapshot hashes, and the
latter two record distinct experimental engine hashes. No saves were upgraded.

The investment stream previously ignored paid department Collections/Risk work
and fell back to nominal headcount/share controls. A real month with arrears and
paid vendor collection capacity reproduces that omission. In explicit9.31 only,
the stream now takes the same authorized task capacity/expertise used by operating
forecasts, without posting the vendor charge a second time. Its ordinary loan
production bridge also removes named advances, repayments and unpaid-interest
writeoffs; named assets are not originated again as ordinary cohorts. The model
still freezes current staffing and noncredit earnings: it is not a60-month promise.

Three targeted investment tests, four workload/legacy tests and three new-rule
simulated transports pass on the corrected source. Initial test failures came
from using an internal rather than public forecast view and from trying to serve
an empty opening collections queue; the retained test now uses natural arrears
after an ordinary resolved month. Historical facility valuation's four scenarios/
480 simulated stream-month identities also pass (not480 campaign months).

The broad regression resume completed agency balances and usability/help checks,
then stopped at the stale checkpoint37 engine-review fingerprint. That review
pin is now updated for the authorized checkpoint66 source after scoped replay
against the preserved reporting/servicing references and the targeted repairs;
no historical golden was changed. This does not convert the mixed-build diagnostic
into a full gate. That repair used portable97323d1c / engineb29af9ec; the shared
credit-comparison correction below is newer.

`output/economics-creditlong66/` is now **terminal at month87 of120 requested**:
a buyout, not receivership or a runtime failure. It continued24→87 under captured
801286c2;63 continued months are not the total campaign length. Both banks had
no emergency debt and positive capital ($2.407M/$2.123M). Loans were$2.451M/$2.716M,
loan interest$13,839/$15,122 and commercial fees$280,848/$198,058. Retained earnings
were+$406,718/+$123,482. Every continued month reconciled causal cash, loans and
earnings. It predates both later forecasting repairs. An early ending is retained,
not reopened to manufacture a120-month pass. No publication is authorized.

### Shared credit-comparison correction and reporting outline

Shared-credit correction portable: `04f118ef304abc5746040540d3435abe432d6a5cb90731e104bcb2d26136d3d6`;
engine: `c7be0356ae8c6f4d716ec2843fa323609359c7da466de405032dd18e8b0478c0`.
For explicit9.31 only, product-allocation comparisons now use the same paid
Collections/Risk preparation as office investment estimates. Product selection,
office investment, funded origination-work acceptance and staffing recovery share
one ordinary-principal bridge; named advances/repayments and interest writeoffs
cannot masquerade as ordinary production. Historical calculations remain on their
old paths. This is a forecast/AI defect repair, not a coupon or cost retune.

Four investment/product regression tests and four workload tests pass, including
exact old-rule creation/AI/RNG/settlement/views against0033ac47, actual9.31 turns
and recovery. The new product regression isolates signed named movements in a
synthetic operating report; it does not claim that report is a funded campaign.
All three new-rule simulated transports pass, with old-peer refusal, two completed
months each, checkpoint/reconnect privacy and delayed-frame protection. Eight
historical product comparisons/56 rows and the Group UI harness pass. Build,
reference and architecture checks pass. The broad resume crossed source builds
and remains diagnostic, not an unchanged-source full release pass.

`output/income-mature-policy-matrix66.json` (97323d1c) expands the unchanged
month24 snapshot into45 legal joint office/staff/policy comparisons. Bank1's
retail conversion with two existing employees reassigned to lending estimates
$192,997/$268,052/$380,633 monthly ordinary production under conservative/balanced/
growth policies; its corresponding next-stage profit is$19,753/$20,149/$20,743.
Bank2's best-production alternatives remain around break-even. These are funded
construction quotes and pure next-stage forecasts, not completed construction,
120-month returns or evidence that aggressive risk is free. The tool no longer
reports a long-run joint value from the original fixed-staff stream: that stream
did not represent the proposed later staffing changes. Older negative-value
probes remain preserved but cannot establish that all coordinated strategies fail.

`output/economics-creditshared-seed2-66/` starts a fresh ordinary9.31 Balanced
campaign with seed `business-balance:2` on04f118ef and **completed120 months**
without an execution or causal-reconciliation failure. It is not a strategic
balance acceptance result. Creation options and resume lineage
are explicit; a resume cannot override saved seed, scenario or rules.

The Frost reference also exposes a remaining reporting gap: securities income
is currently included in `otherIncome`, alongside service income and abstract
staff/technology/wealth bonuses. Do not relabel that whole bucket non-interest
income or infer missing historic securities income from today's asset balance.
The target statement organization is:

| Reporting section | Required distinction in the game |
| --- | --- |
| Interest income and funding expense | Loans and securities separately; deposit interest and borrowing costs; then net interest income. |
| Fees and service income | Deposit, merchant, treasury, agency and investment-service income with actual delivery; eliminate internal group charges. |
| Operating expenses | Personnel, premises, technology/providers, servicing and marketing; shared costs counted once, not allocated arbitrarily to fake product profit. |
| Credit losses and other movements | Keep modeled losses, invoice losses and exceptional items distinct; do not call the current loss model a GAAP allowance/provision system. |
| Balance sheet and cash bridge | Loans/securities are assets, deposits are liabilities, client investment assets are not institutional cash; principal repayments are not earnings. |

This is the implementation outline derived from the linked statements, not a
claim consolidated reporting or economic retuning is complete. The bank operating
statement below implements the first attribution step. Sustaining-cost/customer
source correctness, long-run viability, full gates and human acceptance remain open.

### Recorded bank statement — reporting only

The recorded statement-only candidate was `dd9c768abbcb299f09458a6f44dc3fe99d945600fbba3679712c62c435b7687a`;
engine is `2c59327d2dd83d719ec3f785cd2a32791980766473eebdcbbcb8667979011702`.
Explicit9.31 now records optional flat numeric `incomeSource_*` terms at operations,
including opening-securities interest and the existing payroll/premises/abstract
income terms. Bank forecast has an expandable actual/standing/draft statement with
interest, fees, costs and legacy bonuses separated. Operating-cost details count
embedded platform expense only once. Shared payroll is not turned into fabricated
product profitability; subsidiaries remain separate. Old absent source detail is
unavailable, not inferred from today's balances. Aggregate12-month history and
all creation defaults/rule markers remain unchanged.

Three statement tests pass, including three actual9.31 months compared against
immutable04f118ef: complete campaign state is identical after removing only the
new diagnostic fields, including AI orders and RNG. Current and prior9.31 readers
restore the detailed save. Seven income UI tests cover real actual/forecast amounts,
missing/invalid detail and owner privacy; four workload tests and all three current
simulated transports also pass. Build, generated reference and architecture pass.

The initial nested-detail prototype violated the event ledger's numeric-report
contract. Both the direct restoration test and broad diagnostic caught it. Flat
numeric terms fixed that defect without loosening ledger validation. The broad
resume is terminal with that intermediate failure; subsequent targeted checks
pass on the current artifact. It is not a complete unchanged-build release pass.
The final diagnostic tail completed ondd9c768a: four investment regressions,
three statement tests, three workload-rule transport pairs and six serviced-rule
transport pairs all pass. Earlier suites were not rerun by that tail.

The seed2 campaign above completed on04f118ef, before these reporting-only changes.
Both banks remain active at month120, with loans $5,112,946 / $5,083,541;
deposits $42,681,328 / $26,579,756; cash $25,835,433 / $8,917,234;
capital $2,953,503 / $3,024,992; retained earnings $853,503 / $924,992;
and no emergency debt. Last operating profits were $167,946 / $160,768,
loan interest $27,964 / $27,783 and commercial fees $298,290 / $289,402.
Every actual month reconciles cash, loans and earnings; raw plans and snapshots
are preserved. The diagnostic took2,078,662ms (about34.6 minutes), including AI,
owner views, extra forecasts, validation and repeated report/snapshot writes;
this is not a measurement of browser responsiveness. Recovery includes awarded
loan opportunities; do not attribute it all to ordinary loan production. This is
one completed120-month campaign, not a completed480-month or multi-strategy gate.
Legacy bonuses and fee economics still require repair/validation.

### Income/payroll sensitivity — private experiments, not adopted rules

On unchangeddd9c768a, four ordinary-AI Balanced seed1 experiments completed12
months. Removing staff/wealth/technology/digital income does not change customer
books directly. Lower-payroll variants also change hiring affordability and cost
allocation consistently; no money or staff was injected.

| Private variant | Month12 operating profit, bank1 / bank2 | Retained earnings, bank1 / bank2 | Closing loans, bank1 / bank2 |
| --- | --- | --- | --- |
| Current economics, $18K base payroll | $60,782 / $59,352 | $60,782 / $131,940 | $5.472M / $5.221M |
| No abstract income, $18K payroll | −$37,958 / −$14,903 | −$752,123 / −$761,286 | $5.537M / $5.185M |
| No abstract income, $12K payroll | $27,499 / $55,515 | −$334,855 / $50,923 | $5.544M / $5.252M |
| No abstract income, $9K payroll | $54,663 / $75,676 | −$222,431 / $75,676 | $5.530M / $5.244M |

The original tool run in `output/income-economy-services66/` completed its first
two campaigns, then failed its replacement-count assertion before starting either
payroll variant. A payroll expression also matched a longer identifier. The tool
now uses unambiguous replacement contexts, preflights every selected variant,
and records preflight failures. `output/income-economy-payroll66/` contains the
two completed remaining experiments; do not label the original command a pass.
Every completed month passed actual cash/loan/earnings causal reconciliation and
statement checks. These are not supported saves or modifications to the playable
build. Identical starting seed is not identical later shocks: changed choices
can consume RNG differently. Retained earnings include strategic consequences;
they are not the sum of operating profits alone.

Conclusion: removing unsupported income by itself can materially damage operating
viability; changing pay alone does not establish a viable lending strategy.
The separate24-month Regulatory seed2 comparison completed in
`output/income-economy-regulatory66/` with no execution/reconciliation failures.
The no-bonus/$12K banks ended at −$476,733 / $27,101 retained earnings, with
$29,217 / $71,885 monthly operating profit and $2.896M / $2.957M loans.
The control retained $288,511 / $286,014, with $43,627 / $76,955 monthly profit
and $3.122M / $3.002M loans. Loan repayments still exceeded ordinary production.
The report records repayment, maturity, securities income and relationship
balances. Broader strategy and120/480-month acceptance remain required.

### Provisional service-based economics — explicit8.18/9.32

Prior economics implementation portable: `225d28bee6d9a1aa80e9c8f5e43941e35bc2c56466abc87b3f4cd545f3e5c94b`;
engine: `6e2e348930b9a5bea84800618570e34e8f0ff166cd8548a26547b95c0793a9cb`.
`bankEconomicsVersion:1` removes the five automatic staff/wealth/technology/
digital income terms and uses a shared provisional$12K monthly base salary in
operations, recruitment quotes, hiring affordability, local allocation and UI.
Specialist premiums, training, premises and provider expenses remain additional.
Actual deposit/service, funded loan, securities and subsidiary economics remain
intact. Existing research and customer effects remain; upgrades do not generate
cash merely for existing. Normal setup remains8.16/9.29 and saves never upgrade.
The new marker requires serviced income; Expanded also requires credit workload1.
Both peers must support the new marker, with strict owner/save/view validation.

Three engine tests pass: three actual months per edition match the captured
private experiment; old-rule creation, plans, RNG, settlement and owner views
replay exactly againstdd9c768a; canonical half-ready recovery, rematch and invalid
markers are tested. Core retains its established import normalization of the
obsolete strategy mirror. One UI regression covers four old/new edition cases
with authoritative salaries and unchanged drafts. Six new-rule simulated pairs
pass all transports, reconnect, delayed frames, half-ready restoration and privacy.
This is scoped verification, not the whole Windows release gate.
The complete new-economics diagnostic tail is terminal/pass on225d28be, including
the three workload-rule and six servicing-rule peer pairs in addition to the six
new-economics pairs. Registry/setup, architecture, generated-reference, reviewed
engine fingerprint and documentation checks pass separately on the same source.

The new Core matrix (`output/income-core-economics66.json`) completed24 cases:
18 buyouts, four domination endings, one receivership and one still-active
120-month campaign, without execution errors. Mean month24 accumulated operating
earnings changed from $3.292M to $2.608M for balanced staffing, $2.312M to $1.845M
for lending and $4.593M to $4.014M for commercial. These Core totals exclude
strategic spending, are not retained equity, and do not prove commercial balance.
Rate seed2/balanced failed at month104 with $67.394M emergency debt and negative
capital; retain that failure for investigation. The actual9.32 Expanded
120-month run in `output/economics-servicebased66/` is now terminal; see below.
The provisional boundary is functional, but fee scaling, conventional lending
viability and wider stress acceptance remain unresolved.

### Shared servicing and completed income evidence

Prior shared-servicing portable: `13b8ad49c63cf5f3774b71096fe345f651f4c4815c66332d129c35c83c0fd0de`;
engine: `ea4185c834b86d118a39cbc1968931a7153519270515e3e4e73db88e9fe08b4a`.
One shared relationship-work helper replaces three duplicate formulas without
changing their original left-to-right arithmetic. Fractional/offer workload,
fee/context agreement and actual two-month Core8.18/Expanded9.32 creation,
plans/RNG/state/private-view replay are checked against immutable225d28be.
The first test invocation failed on a test's `raw` property: the actual quote
uses `rawWorkloads`. That harness error was corrected; no engine rule changed.
Historical references and goldens remain unchanged. No numerical experiment
below has been adopted into the normal game.
The combined final scoped invocation is terminal/pass: eight servicing/helper
tests plus the department-context script (12 checks/180 combinations/33 months)
and reviewed-engine fingerprint, ten Node test entries total. This is not the
complete Windows, real-browser or human multiplayer gate.

**Expanded120, terminal on225d28be:** both banks remain active with no emergency
debt. Ending loans $2,712,966/$2,027,785; deposits $42,975,755/$30,011,594;
cash $28,128,009/$15,390,239; capital $2,226,399/$2,182,391; retained earnings
$126,399/$182,391. Last monthly operating profits $162,068/$182,391, loan interest
$14,591.58/$10,775.05 and commercial fees $279,907.20/$279,603.42. All120 months
passed recorded root-level cash/loan/earnings reconciliation. Diagnostic time
1,838,876ms includes AI, extra forecasts, validation and snapshot/report writing;
it is not browser response time. Low staffing/morale and shrinking lending still
need strategic review. One balanced seed is not the full matrix or480-month gate.

**Private service design, terminal on13b8ad49:**
`output/income-economy-servicedesign66/` preserves three ordinary-AI24-month
Balanced seed2 runs. Existing provisional economics finished at retained
$26,532/$206,439. A private $6K salary and $250 business/$200 merchant fee
variant ended at -$1,422,569/-$667,429. Also raising service work to20 business/
50 merchant relationships per quarter ended at -$355,702/-$1,051,709. All runs
completed with statement and causal checks, but the cuts did not establish
viability and are not accepted tuning. Matched opening seeds do not guarantee
identical later economic paths after endogenous choices diverge.

**Core funding failure, reproduced:**
`output/income-core-funding-economics66/` captures source, opening, closing and
all104 actual months. It exactly reproduces the earlier matrix's final balances.
Month64 begins with only $155,630 loans. Organic operations add $150,620 net
loans, but $732,406 competitive withdrawals plus $586,321 promotional runoff
exhaust $655,944 cash and the $306,250 loan book, creating $374,908 emergency
debt. Subsequent borrowing reaches $67,393,743 at104. This is not loan-credit
losses alone. Core's simplified growth does not fund new deposits/loan production
through the Expanded accounting book; withdrawals nevertheless consume cash
and assets. That mismatch requires explicit compatibility-safe investigation,
not arbitrarily waived losses or a claim that one large debt proves intended risk.
Controls in `income-core-funding-legacy66/` and `income-core-funding-serviced66/`
ended by buyout at52/54 and are not surviving104-month comparisons. The initial
`income-core-funding-66/` report mistakenly labels completion103 by subtracting
from a terminal cycle; it contains104 rows. The tool now counts actual resolved
rows; the corrected evidence is preserved separately, not overwritten.

### Core cash and balance-sheet correction — explicit8.19

Preserved explicit-rule portable: `3730536d4680180367f23956cfb5cd4fc2b95d54b37654380a7b72627c9274ff`;
engine: `c45482297ecfd1ff5d4e2ff4c8dd6a8d29e419dd66a7bf1947fea40c4295242f`.
`bankEconomicsVersion:2` is Core-only, requiring serviced income and funding2.
It reuses AccountingPrototype1; no Expanded geography, feature books or feature
checkbox is introduced. New opening accounts retain the exact original cash,
deposits, loans and equity; their residual backing securities are now explicit.
The opening journal checkpoint records that composition rather than inventing
past transactions. Existing campaigns are never converted into this book.

Deposits carry matching cash; loan originations use cash; losses reduce assets
and equity. Full earnings and strategic expenses enter retained equity instead
of the old25% positive-profit capital increment. The old automatic liquid-policy
$35K cash grant does not post. Acquisitions and ending absorption move assets,
liabilities and backing cash between owners rather than cloning balances.
The AI uses existing capital-reserve checks. The UI shows reconciled accounts,
the20% securities exposure and actual income/funding sources. Both peers need
`coreAccountingSupported:1`; the existing `bankEconomicsSupported:1` handshake
is unchanged for8.18/9.32 peers.

**Scoped verification:** seven Core engine tests cover all four openings,
funded transactions,12 actual months with half-ready reload, pure forecasts,
strict books/rules/peers, acquisitions, absorption, rematch and no free liquid
cash. One UI test verifies accounts, salaries and earnings without mutation.
Three simulated GitHub/LAN/direct pairs pass two resolutions, half-ready
checkpoint reload, fresh handshake, stale-frame refusal and owner privacy.
The final combined legacy/new-rule invocation passed12 entries before adding
the separately passing no-grant test. Exact old creation, AI/RNG, settlement and
private-view replays passed against unchanged225d28be/dd9c768a references.

**Balance evidence on preserved3730536d:** `output/income-core-books-final66.json`
contains24 strategy/scenario/seed cases:15 buyouts, one domination and eight
still-active120-month games; no execution errors or receiverships. The smallest
ending capital is $2,899,116. All final outcomes/balances exactly match the prior
c7f061eb matrix; final-source diagnostic time was75,670ms, not UI response time.
The final-source `income-core-funding-books-final66/` Rate/seed2 case completes
120 with loans $37,696,506/$31,278,273, capital $12,529,599/$39,091,223 and no
emergency debt, versus the old8.18 failure at104. Deposits grow to
$262,177,289/$1,038,265,296; the rival still loses $879,988 in the final month.
Commercial cases reach very large retained earnings. Thus removing the broken
funding loop does not establish appropriate scale, investment behavior or a
balanced strategy set. Core retains its simplified customer/product model.

Initial development checks caught an opening-journal mismatch, the Core AI
omitting accounting reserves, and missing deposit-interest statement detail.
Those were corrected, not suppressed. A zero-versus-negative-zero test assertion
and an old network assertion hard-coded to marker1 were corrected separately.
The initial network log mislabeled its scope as six pairs; its Core-only loop
executes three, as recorded above. Future logs now label the Core-only loop.

**Now adopted by setup:** the existing edition choices select Core8.19 and
Expanded9.32. Full Windows checks, broader balance/stress, browser and human
multiplayer acceptance remain required.
No V3/V4 package, commit or GitHub publication was changed.
The final diagnostic resume from `tests/bank_economics.test.js` is terminal/pass
on3730536d:14 engine/UI tests and18 simulated pairs across current Core accounting,
bank economics1, credit-workload and serviced-income rules. Build/reference,
architecture, edition/setup, reviewed fingerprint and documentation checks also
pass on the same source. This is explicitly a partial diagnostic gate, not the
complete Windows suite. Frozen V4 HTML/ZIP hashes were rechecked unchanged.

### Current edition integration — usable defaults, unchanged historical rules

Edition-integration portable: `ffb6ddc50ce39612018ab50b93aca62cac73bd41bc55e291489a116abc450dd7`;
engine: `b5e431190d86109aaa4a3fc6dd6a47ddd0d5b5a4557bec107f1ba95857641642`.
Setup and host-edited lobbies now request the current economic rules through the
same pure edition proposal. There is no new checkbox or saved feature map.
Historical direct creation and reporting-only proposals retain their prior
defaults. Existing saves, Continue and rematches do not upgrade.

**Terminal scoped checks:**18 engine/setup/compatibility entries pass, followed
by15 edition/income/accounting UI entries including exact creation and two-month
AI/RNG/full-state/private-view replays against the unchanged3730536d reference.
All six current edition/transport pairs pass (Core and Expanded across simulated
GitHub, LAN and direct link), including host authority, cancellation, atomic
settings, readiness reset and actual settlement. Six historical reporting-only
transport pairs separately pass checkpoint/reconnect/stale-frame/privacy checks.
Initial current-UI assertions expected the former8.16/9.29 defaults; those were
updated while retaining explicit historical profile and replay tests. No golden
or existing reference was regenerated to accommodate drift.

No economic rates or settlement behavior changed in this adoption step. The
3730536d balance evidence remains identified above, not relabeled as a fresh
full-length run on this UI build. This is not full Windows, real-browser or
two-computer acceptance. Frozen V3/V4 packages and publication are untouched.

**Broader regression sweep stopped, not passed:** `node tools/check.js` on
ffb6ddc5 has passed build freshness, deterministic assembly, reference/EOL,
documentation links, architecture, group accounting, receivables, the1920-month
isolated company-finance matrix,360-month company/bank funding boundary and
288-month corporate-income checks. These component months are not whole-game
stress campaigns. Subsequent terminal passes include group-foundation and
institution legacy comparisons, setup/lobbies, private network/recovery and
duplicate handling, strategy/operations controls, packaging, campaign lifecycle,
790 golden campaign turns, launcher/storage, staffing, households, collections,
products, onboarding, advertising, agency, departments and facility lifecycle
workflows. Integrated staffing then passed four24-month scenarios and historical
Group7/8 replay (seven tests, about16.6 minutes), followed by advertising,
market/commercial workflows and facility extensions. The sweep exited1 at
`facility_extensions_ui.test.js`: current setup was incorrectly expected to
create9.29 rather than9.32. The assertion now checks9.32 and its economic/workload
markers, retaining the separate historical9.11 creation assertion. A partial
resume from that suite reached the last commercial-network command and the
process has ended; its final receipt was not recoverable, so no passing terminal
outcome is claimed.
The separately run
reviewed-engine fingerprint and final documentation checks pass. V4 HTML/ZIP
hashes again match their frozen identities. Do not convert this partial progress
record into a full-gate claim.

**Completed early-ending stress result, not a480-month pass:**
`output/economics-servicebased-regulatory66/` preserves ffb6ddc5 and ordinary
Expanded9.32 AI, Regulatory / `business-balance:2`, requesting480 months.
Its terminal report records a buyout at month145, no execution failure, and
2,594,321ms diagnostic runtime. Both final books remain separate: capital
$1,942,087/$2,025,505; cumulative bank earnings −$157,913/−$74,495; loans
$1,809,951/$3,079,438; deposits $31,957,662/$19,153,287; cash
$16,530,202/$3,550,305; emergency debt zero. Positive last operating profits
($288,289/$274,124) do not imply positive cumulative earnings after other stages.
Closing snapshot SHA256:
`a0570ca7580534a90042fe4a41a756da025342d40cde12c225a3d654b0dffb27`.
The small loan books and early control ending require gameplay interpretation;
do not resume an ended save, hide its ending or relabel it as480 months.

**Current reporting-label repair:** portable
`abbe51d3022e16728912043dd23d50bf3b663b1207cdc0756edf007a4cd1d318`;
engine remains `b5e431190d86109aaa4a3fc6dd6a47ddd0d5b5a4557bec107f1ba95857641642`.
A failing UI reproduction showed Core's simplified deposit-linked contribution
mislabeled as billed deposit-account fees in the detailed statement. The UI now
names the abstraction and its actual drivers; Expanded keeps its account-fee
label. No rates, amounts, state fields or settlement rules changed. All11 tests
across income review, Core accounting and facility-extension UI pass, including
owner/draft purity and exact authoritative amounts. The reviewed engine-byte
boundary passes. Earlier full-campaign evidence retains its captured source hash.

### Income-source audit — current rules, not a claim of economic completion

The Frost/JPMorgan references above inform classification, not target revenue
shares. The following source tracing separates earning activity from asset and
funding movements. These are simplified game contracts, not a bank valuation model.

| Source | Activity and timing | Constraint, sustaining cost and accounting boundary |
| --- | --- | --- |
| Loan interest | Core uses its aggregate loan model; Expanded uses contractual cohorts, including funded originations in the current operating month. Nonperforming interest is excluded where modeled. | Origination/servicing work, facility throughput, capital, funding and credit losses constrain returns. Named-company credit is settled separately and added to reporting once; repayments are principal, not income. See `accounting-adapter.js`, `corporate-income.js`. |
| Securities interest | Opening bank-owned securities earn at the modeled policy-linked rate. | Requires a backed asset balance; sales change future earning assets and can realize losses. It is not a return on client custody assets. See `accounting-adapter.js`. |
| Core deposit-linked contribution | A rate/strategy-dependent contribution calculated from aggregate deposits, not actual account billing. | Separate funding interest, payroll and premises costs still apply. This remaining abstraction can favor deposit growth and needs balance interpretation; correcting its label does not repair the economic model. See `operations.js`. |
| Expanded deposit fees | One billable primary-account equivalent per active relationship, allocated across funded products; not one fee for each product held. | Product-specific fees, servicing, funding interest and platform costs apply. Empty segments do not create customers. The deposit adapter replaces the legacy contribution rather than adding both; platform cost is already embedded in servicing. See `segment-deposits.js`, `deposits.js`. |
| Business/merchant fees | Beginning relationships earn only to the extent covered by delivered relationship service. New gains begin contributing next month. | Core automatically reserves the same Business allocation; Expanded uses its existing paid department task. The provisional760/650 fee bases and80/150 relationship workloads remain aggregate proxies, not recorded transaction invoices. Strategy/product multipliers remain a balance assumption. See `commercial-fee-economics.js`, `operations.js`. |
| Payroll/merchant/treasury agreements | Named-company service bills replace provisional contract income; paid, receivable, recovered and written-off amounts remain distinct. New awards begin earning next cycle. | Capacity, supported platforms, renewal competition and company cash/credit constrain delivery and collection. Reporting flags prevent counting the same fee or recovered invoice twice. See `services.js`, `corporate-income.js`. |
| Insurance agency | A funded company pays premium to a third-party carrier; the carrier pays the agency its commission in the servicing step, including a newly won eligible relationship. | Permission, qualified producers, product workload, outreach, premises and ongoing professional costs apply. Agency cash is separate; parent dividends are transfers, not a second commission. The game does not put underwriting losses on the agency. See `agency.js`. |
| Advice, brokerage and custody | Existing serviced investment clients pay the modeled fee from their own resources; unpaid fees stay identified. Filled trades and note subscriptions have separately identified charges already included in the fee total. | Qualified work, permissions, custody/operations throughput, provider charges and entity expenses apply. Existing obligations precede acquisition. AUM, client investment returns and transferred securities are not institution revenue. See `investment-clients.js`. |
| Company ownership | Funded company distributions pay the parent; liquidation and investment-basis losses are separately recorded. | Requires purchased ownership and actual company funds. Dividends do not create bank deposits, and ownership does not create a banking customer. See `company-shares.js`. |
| Generic staff/upgrade bonuses | Current economic editions remove automatic generic staff, technology, digital and wealth income grants. | Historical campaigns retain their rules and labeled historical amounts. Research still changes supported capabilities; no historical save is silently retuned. See `bank-economics.js`, `operations.js`. |

**Remaining audit acceptance:** source tracing is not a controlled cross-strategy
balance matrix. Verify conventional lending viability against deliberately
fee-focused delivery after all continuing costs and credit/funding risks, retain
the observed early ending, and finish exact-candidate regression and visual
acceptance. The terminal145-month run does not supply the missing480-month
campaign evidence or establish enjoyable long-term competition.

### Actual lending-office trial — short because the campaign ended

`output/income-branch-realized66/report.json` compares three continuations of
the same active Balanced month120 snapshot, using current abbe51d3/b5e43119
source with no rule upgrades or injected resources. Requested12 further months;
all three arms ended by buyout at125 (five actual months), without validation,
income-reconciliation or cash/loan/earnings causal-bridge failures. Runtime
260,383ms is a concurrent-process diagnostic, not a browser benchmark.

| Seat0 policy | Ending loans | Five-month loan interest | Five-month operating profit | Closing retained bank earnings |
| --- | ---: | ---: | ---: | ---: |
| Ordinary AI | $2,426,289 | $68,167 | $872,848 | −$489,253 |
| Defer unstarted research/projects | $2,426,289 | $68,167 | $720,166 | $476,565 |
| Deferral + funded lending-office plan | $2,662,318 | $70,869 | $729,551 | $552,880 |

The intervention paid$153,070 to convert an existing ATM into a retail office
through normal work/activation. It reassigned one existing employee to lending
in months122 and124 when available; at other times the five-person workforce
had no spare Business/Retail employee above the retained minimum. All proposed
plans were accepted. Department and office work was re-planned through existing
shared functions, not installed as a hypothetical completed facility. These
are whole-plan comparisons: changed servicing, spending and rival responses
mean the retained-earnings difference is not the isolated return on conversion.
The short interval does not establish payback, long-term loan-franchise viability
or an optimal strategy. Preserve the endings instead of extending the saves.

The preceding one-month smoke trial is in `output/income-branch-smoke66/`.
Its ordinary arm's entire closing world and RNG exactly matched a separate
plain-engine execution, verifying that exposing the existing planning helpers
did not change that control trajectory. Documentation checks pass77 files/603
links; the portable remains current with199 inputs. The broad partial regression
is still live (observed at company-credit forecasts), not signed off.

**Ending-design decision:** Group8 deliberately restored automatic
score/stalemate endings; Group10 retains them. This conflicts with the earlier
no-automatic-buyout rivalry direction. User review has been requested for new
campaign rules only. No ending behavior or historical rules changed here.
The guide's claim that every Regional Rivalry campaign disables those endings
is corrected to distinguish current Expanded, older groups and Core.

### Workforce units and recovery-context repairs

Current portable SHA256:
`ce11f7ca1c9994bb0a2fc9c702e54916ac16d3da1bd96b4994959aed1d1da153`.
Engine remains `b5e431190d86109aaa4a3fc6dd6a47ddd0d5b5a4557bec107f1ba95857641642`;
these changes affect UI presentation and local draft guards, not economic rules.

- A failing UI reproduction showed the People overview rendered canonical
  quarter-units while the work editor used employee-months. The overview now
  divides only displayed time by four and labels one full-time employee as1.
  Exact underlying fractions, negative overcommitments and draft values remain
  unchanged. Current commercial-servicing warnings now mention recurring fee
  coverage; old-rule warnings do not imply that new fee rule exists.
- A second failing reproduction showed a previously reviewed recovery option
  could stage while a GitHub connection was paused. Comparison, staging and undo
  now share existing owner/connection identity checks, exact draft checks and
  the current connection-attempt boundary. Detached controls cannot apply a
  newer proposal with the same key. Paused controls explain that the player
  must reconnect and compare again. No transport protocol or save field changed.

**Scoped verification:**35 People/workforce checks pass across overview,
five-desk workflows, object editors and actual department settlement. Recovery
tests retain successful staging/undo, budget and sealed-plan checks, and add20
stage/undo context cases, four detached comparison-button cases, paused display
and replaced-proposal guards. These verify real client handlers with a simulated
DOM, not rendered laptop layouts or real two-computer play. Build freshness and
the reviewed engine-byte boundary pass. The existing broad diagnostic tail is
still running; it began before these UI edits, so it cannot certify one unchanged
final portable even if it exits successfully. Its terminal status remains open.

**Mature planning performance, measured:** the real120-month9.32 snapshot
contains17,492,820 uncompressed JSON bytes, of which16,234,451 are event history.
`output/pricing-snapshot-profile-121-current.json` records14,434ms for two ordinary
AI plans; `output/income-planning121-before66.json` independently records14,180ms
with a CPU profile. Both compare instrumented plans/full world/RNG exactly with
the plain engine. The profile identifies101 operating forecasts and189 department
quotes; repeated owner cloning and department-history validation are material
costs. Large history alone does not prove it causes all planning time.
These concurrent-process Node measurements are not browser response benchmarks.

Two bounded private experiments preserved exact mature plans and world but
provided no demonstrated speedup: reusing already validated department quotes
measured14,280→14,747ms; reducing a private trial-owner fixture to its required
headcount measured14,220→14,122ms. Neither substitution was adopted. The game
engine and rule versions remain unchanged. Do not repeat these substitutions
as presumed performance fixes; reassess shared preparation using the CPU evidence.

**Completed mature continuation:** `output/income-extended-66/report.json`
continued the preserved checkpoint65 Balanced month108 save through month120
using the reporting candidate `b34d0ce8…` and frozen V4 side by side. All 12
continued plans and complete post-turn campaign states matched exactly; both
banks survived, had no emergency debt, and retained 12 actual income records.
At month120, bank 1/2 loan interest was $10,843/$11,116, commercial fees
$218,256/$210,864, and loans $1,987,704/$2,059,206. Cumulative Expanded bank
earnings were −$826,082/−$1,376,530 despite positive operating profits. This is
not a Regulatory480 test, a new-game replay of all120 months on the latest UI,
or proof of balanced strategy. The loan-franchise/fee relationship remains a
material investigation item; the later agency change only restores a disclosure.

**Mature bottleneck probe:** `output/income-mature-66.json` tests unchanged,
balanced and growth lending policies within the same next-month AI draft on
the preserved month120 world, using candidate `cab4b81e…`. Both banks have only
one open ATM; the shared facility ceiling is $100K/month. Bank 1's five assigned
lenders leave 0.75 physical FTE for origination after other commitments; bank 2's
four leave 1 FTE. Conservative→balanced increases bank 1's forecast funded
principal from $91,814 to $100,000; growth adds no further volume. Bank 2 already
hits the ceiling under all three policies. These are pure, unsubmitted forecasts,
not realized returns or a future-loss comparison. The next repair must examine
facility investment/AI allocation as well as fees, rather than simply lifting
loan yields. No world, plan or live random state changes during the probe;
AI draft generation uses a copy because it legitimately advances its AI stream.
Latest-candidate Financial Group and Credit product UI harnesses also pass.

`output/income-mature-facilities-66.json` adds pure conversion reviews to that
same snapshot. Bank1 retail/commercial conversions add no origination under the
fixed staff plan and have negative60-month projected values (~−$1.45M). Bank2's
digital conversion lifts projected production to$131,079 but its projected value
is still negative (~−$470K). These are frozen-policy investment estimates, not
realized losses or proof no coordinated lending strategy can work. They justify
testing staffing and facility investment jointly; no forced construction or
economic parameter adjustment was made.

**Core strategy diagnostic:** `output/income-core-matched66.json` records 24
campaigns: three customer-facing staffing tilts × four scenarios × two fixed
seeds, each targeting 120 months. The same-rule bot handles other choices;
Operations reservations are preserved. All reached month24 without a runtime
failure; one reached120, 21 ended by buyout and two by domination. Earlier
endings are not 120-month passes. Matched month24 averages across eight starts:

| Staffing tilt | Cumulative Core operating earnings | Cumulative loan interest | Cumulative business/merchant fees | Outstanding loans |
| --- | ---: | ---: | ---: | ---: |
| Balanced | $3,604,359 | $1,714,331 | $3,302,090 | $16,738,699 |
| Lending | $2,740,304 | $2,478,258 | $2,298,244 | $28,644,038 |
| Commercial | $5,071,984 | $1,392,305 | $5,031,895 | $12,281,499 |

This supports further fee/capacity investigation, not an optimal-strategy claim
or a finding that ordinary lending cannot succeed. Core's `stats.earnings`
accumulates operating profits; it is not Expanded's retained-equity ledger and
does not deduct separate strategic cash/capital spending. The table is after
operating costs, funding and credit losses, not an all-in investment return.
Interest and fees are shown gross, not independent profits. Core's capital
ratio below is its game capital mechanic, not a real-bank regulatory measure.
The initial `income-core-baseline66.json` retains invalid test-policy failures:
the harness reassigned Operations staff needed by the bot's projects. That was
a diagnostic-policy defect, corrected before the matched comparison, not a
reason to weaken game validation. No production balance parameter changed.

### Revenue trace established so far

| Source | Current implementation and audit implication |
| --- | --- |
| Ordinary loan interest | Core uses its aggregate book/rate estimate. Expanded accrues performing cohorts at retained rates after scheduled repayment, including newly originated loans in that month's accrual. Audit full-month origination timing before changing yields. |
| Named-company interest | Company settlement posts the funded claim once; the operating report adds an explanation, not a second cash credit. Separate borrower principal servicing is now included in the movement UI. |
| Securities interest | Accounting adapter credits the existing securities balance at policy-rate/12. It currently sits in `otherIncome`; that aggregate must not be labeled entirely fee income. |
| Deposit income/funding | Expanded replaces the legacy deposit-linked abstraction with actual modeled account fees, interest and servicing. Core retains the older abstraction, now explicitly labeled. Deposits themselves are not revenue. |
| Business/merchant income | Relationship counts × recurring fee factors, following same-month relationship additions. It does not itself limit the whole recurring book to serviced transactions. Active mandates are a different source; growth/activation/retention and shared support costs need the remaining audit. |
| Staff/upgrade/legacy wealth income | Operations retains production-staff, technology, wealth and digital income terms. These need explicit sustaining-activity attribution before any new-version correction; no old-save parameters were silently changed. |
| Treasury/merchant/payroll mandates | Service delivery checks reserved finite capacity and treasury platform eligibility; direct, outsourcing and platform expenses persist. Named-company cash, receivables and invoice losses constrain collected/billed fees. Those invoice losses are now visible in reconciliation. |
| Agency/subsidiaries | Agency commissions use third-party premium/carrier flows, not underwriting. Complete subsidiary-specific staffing, fee, maintenance and parent/group reconciliation remains part of the checkpoint; bank `otherIncome` is not claimed to summarize all subsidiaries. |

Matched month24 lending-tilt averages also show the tradeoff: $714,886 cumulative
credit losses and 10.1% capital ratio versus commercial tilt's $437,698 and
25.5%, with average cash $263,142 versus $445,970 and no emergency debt in either
set at that observation. These diagnostics do not justify a hard revenue-mix cap.

## Exact local fingerprints

| File | SHA-256 |
| --- | --- |
| Frozen ZIP | `85dae43104c4c68f106b371b6ead8891a453bd08a4198162133a493e3a7ab28f` |
| Frozen manual PDF | `b577325f9c4fd34a2e73a3feda41acd47dc4e0ecd7b2b3c3dfec568cb5b9e1ed` |
| Frozen packaged HTML | `4d616ad43145baac692d49aa6f864fefe96e0fffa7396cc81554107ee21cd107` |
| Local playable HTML / checkpoint66 source | `e056eeab470d3f41e68ff12e1a93d28a085e7fa0b0547f60d217043dae6cc1f1` |
| Historical V4 rc1 packaged HTML | `1c488be30061e6729b56bc0a6bf81f838aec7dc039916284429509a06659df00` |
| Checkpoint51 Expanded artifact | `c22b610643d5b67174d0c0be0f9054e3180d6c031257435e86a726f5a5ed0bc7` |
| Checkpoint53 earnings repair | `8bf31b8f2725074c06b7dbbc1b1ccae8372f5ec09cea6a17292e47aa2dc7a329` |
| Checkpoint54 Credit workspace | `4a3de860a523d8754d0b2a5b2647c27f042ed375f806d1544bbeb71889ee90de` |
| Checkpoint55 Research delivery | `afde61a6409a0c176a8586f682431bf5817db8712eef1613beaab7e88562c001` |
| Checkpoint56 credit foundation | `dbb982bb7baa079b57cff752d1341873c73b07c26d27a38fcd7d96894cefd530` |
| Checkpoint57 credit trading | `2bc2ca41f6675d2cd0874219fffd7a24847927f27c99cd74e3c5100a4fc43cc2` |
| Checkpoint58 bank credit review artifact | `c364cf4266df44e46ba6266aa6455e0e550e1d811873c752215c7aa4e6dc838d` |
| Checkpoint59 loan orders | `1b4d0a594e964ada574813fb88640c10cde2205c7a777cc5b4377b80d5e3b214` |
| Checkpoint60 credit forecast artifact | `0788b9570739bafd7db1725e4406f72d0fc383ecc91dff359da68fde10b5ec90` |
| Checkpoint61 cash location | `b6bbcfcf1ba2518c5aa74fb701d80985a56874068e7540de4572e399af2a6ea7` |
| Checkpoint62 campaign integration | `316558349a6548a7ce35f67aaa8a2c621a4be6dc0094c1f0e80e043ed3d3cfc2` |
| Checkpoint63 customer loan desk | `ec9a84e55a443f9c144fd14b57fc86fa32adb3df9aab5607ae4cb839b6373db4` |
| Checkpoint64 rival credit artifact | `59b0a937acbebb28e93c699041a6d9aa70b7cf0ff5ef999b8aec5df6d3cf4b40` |
| Preserved checkpoint65 review artifact | `1c488be30061e6729b56bc0a6bf81f838aec7dc039916284429509a06659df00` |

Hashes identify bytes, not balance, usability or universal correctness.

The [checkpoint62 initial report](../output/master-checkpoint62-verification.json) retains 26 passing tests and architecture, plus an unseeded network-test failure when underwriting correctly refused the scripted loan. The [fixed-seed network recheck](../output/master-checkpoint62-network-recheck.json) passes all three simulated transports against the same source/artifact, without changing gameplay. Both records are required; the initial report was not rewritten. Earlier [checkpoint61](../output/master-checkpoint61-verification.json), [checkpoint60](../output/master-checkpoint60-verification.json) and [checkpoint55](../output/master-checkpoint55-verification.json) reports retain prior evidence. No normal playable or frozen package was overwritten; later source edits require a new comparison. Scoped checks do not replace the full Windows gate.

## Current verification evidence

- [Checkpoint65](archive/checkpoint65-expanded-credit-2026-09-13.md): [combined exact-build acceptance](../output/master-checkpoint65-acceptance.json) covers126 affected tests after the retained initial failures and targeted historical-fixture corrections. Shared setup regressions, five transport command groups and source architecture pass. The ordinary-AI120/480-month experiment has been launched; no terminal balance result is claimed here. This does not substitute for the full Windows/package or human gates.
- [Checkpoint64](archive/checkpoint64-company-credit-rival-2026-09-13.md): [terminal exact-build record](../output/master-checkpoint64-verification.json) passes28 targeted strategy/ending, campaign, UI, old-rule, order and forecast tests, source architecture and all three simulated transports. Qualified AI lending funds once and restores exactly; actual ending-stage triggers preserve bank/company claims. Eight ordinary AI months remained valid with zero loan offers. This is not a long-run balance or final integration pass; ordinary Expanded enablement remains next.
- [Checkpoint63](archive/checkpoint63-company-credit-desk-2026-09-13.md): [exact-build record](../output/master-checkpoint63-verification.json) passes41 targeted tests, seven monthly-plan checks, source architecture and all three simulated transports. Contextual review/stage/cancel/remove, stale/locked/hotseat guards, conditional forecast funding parity and exact historical comparisons pass. [Early forecast timing](../output/master-checkpoint63-forecast-timing.json) records about101 ms median for ten month3 single-offer calculations, not browser or mature-game performance. No balance tuning, ordinary Expanded enablement or final release acceptance is claimed.
- [Checkpoint62](archive/checkpoint62-company-credit-campaign-2026-09-13.md): real paid development, submitted funding, half-ready exact replay, later repayments and rematch under9.28. Strict markers/claims/transients, numeric operating ledgers, preserved pricing traces and private views pass. Fixed-seed GitHub/LAN/direct-link simulations pass missing-capability refusal and delayed-message protection. Customer UI, AI, long-bank balance and final release acceptance remain open.
- [Checkpoint61](archive/checkpoint61-company-credit-location-2026-09-13.md): 31 targeted results plus source architecture/syntax pass. Paid account-development fixtures verify same/rival lender cash location, public-owner forecast parity and once-only deposit reporting. Controlled loan principal/interest and wholly owned group earnings reconcile. Existing Group10, Core/Expanded and paid-control tests pass. No supported credit campaign, full-bank balance, new multiplayer or browser acceptance is claimed.
- [Checkpoint60](archive/checkpoint60-company-credit-forecast-2026-09-13.md): 39 targeted tests and source architecture/syntax pass. Public-only forecasts match real lender books through healthy/stressed company trading; actual monthly banking reports reconcile without duplicated loan income. Business-loan forecasts include named claims. These explicit credit-world tests are not supported campaign enablement, full-bank balance or multiplayer acceptance.
- [Checkpoint59](archive/checkpoint59-company-credit-orders-2026-09-13.md): 32 targeted loan-order, funding, bank/trading, domain, assessment-UI and exact historical-boundary tests passed, plus source architecture/syntax checks. Tests establish the operating relationship through actual submitted turns, then use an explicit credit-world fixture; this is not yet playable campaign lending or a supported save upgrade. Full monthly/reporting, UI, AI, recovery and network integration remain open.
- [Checkpoint58](archive/checkpoint58-company-credit-bank-2026-09-13.md): 25 targeted tests and source architecture pass. Named assets reconcile with ordinary amortization, collections, funding-sale limits and department workload. Player orders, full campaign cash/reporting, versioned peers and release acceptance remain unfinished.
- [Checkpoint57](archive/checkpoint57-company-credit-trading-2026-09-13.md): 19 targeted credit/trading/UI/historical-boundary tests and source architecture passed. Healthy48-month repayment and120-month borrower stress conserve cash and expose real lender losses. This is not full-bank campaign balance; player loan instructions and their campaign/network adapter remain unfinished.
- [Checkpoint55](archive/checkpoint55-research-delivery-2026-09-13.md): all six combined funded research/delivery cases passed across54 resolved months, including product adoption, Treasury migration and Payroll maintenance. Prepared service-use display and targeted source UI/architecture checks passed. This is functional acceptance, not matched long-run profitability or a full release pass.
- [Checkpoint54](archive/checkpoint54-credit-workspace-2026-09-13.md): prepared Credit staffing, explained loan flows, contextual remedies and stale-control protection. Targeted engine/UI/architecture checks passed with unchanged AI and saved simulation. Final broader/human acceptance remains open.
- [Checkpoint53](archive/checkpoint53-earnings-diagnosis-2026-09-13.md): current Expanded earnings-summary repair, exact-state/RNG and historical public-view comparisons, source architecture and simulated GitHub/LAN/P2P privacy/recovery checks passed. A separate24-month checkpoint51 diagnostic reconciles all monthly financial movements; executive spending and repayments materially explain losses and shrinking loans. Further strategy/capacity investigation remains. No balance tuning or final release gate is claimed.
- [Checkpoint51 long-run report](../output/master-checkpoint51-commercial-expanded-long.json) is terminal, exit0. Balanced120 survived with retained losses and shrinking loans. Regulatory ended at month263 of480 requested, with one bank at negative capital; no validation exception. This is an early-ending balance result, not a480-month pass. [Recorded terminal observation and limitations](archive/checkpoint55-research-delivery-2026-09-13.md#completed-older-stress-observation).
- Earlier scoped passes and failed funding fixtures remain in the [checkpoint evidence index](v3-usability.md#evidence-index) and [historical archive](archive/README.md#subsequent-implementation-evidence). They are not fresh tests of this candidate.
- [Completed ordinary Balanced120 report](../output/master-checkpoint44-commercial-expanded-120.json): terminal, not running. No validation or bank failure; both banks retained cumulative losses and shrinking loan books. Neither opened investment operations or acquired control.
- Forecast visibility, independent construction destinations and five-benefit Expanded confirmation passed seven targeted portable checks plus GitHub/LAN/direct-link simulated construction tests.
- Documentation cleanup checks are separate from game debug/release checks. No new full gameplay gate is claimed here.

## Known issues and release blockers

| Issue / missing gate | Required action |
| --- | --- |
| Shared-premises final acceptance | New Expanded9.28 retains same-rule AI, peer handling and contextual office controls. Paid two-office closure/replay and qualified staff-loss tests pass; whole-campaign viability, final combined reconciliation and real-browser layout acceptance remain open. |
| Long-run economic concerns | Explain and address cumulative losses, shrinking loans and ordinary-start diversification viability; retain legitimate dominance and no free catch-up. |
| Remaining approved management/product/customer/research interactions | Finish the [master checklist](v3-usability.md#master-requirement-inventory-and-finish-gates); do not replace working mechanics with placeholders. |
| Browser/UI acceptance | Checkpoint 67 sampled early Core/Expanded, month-121 People/office/client workflows and 1280×720/760×800 layouts in the actual browser. Wider panel/device coverage and subjective human acceptance remain open; historical URL denial is not the current result. |
| Exact final integration / packaging | Run the final Windows, lifecycle, privacy, multiplayer, conservation, performance and120/480-month strategy gates on the delivered bytes. |
| Final manual and local release package | Complete help/manual, render and visually inspect the PDF, package with matching reports and known issues. |

## Human acceptance and authority

The user explicitly authorized committing current work and publishing the V4 testing snapshot. [V4 playtest notes](../../releases/v4-playtest-notes.md) describe its limits. This does not certify implementation completion or authorize future unrelated publication; V2/V3 and main remain preserved.

Real two-computer multiplayer, long-session recovery and subjective enjoyment remain human acceptance items. Simulated peers cannot certify them. No claim of bug-free multiplayer is made.

No new user content decision blocks the next approved implementation step. National Empire, insurance underwriting, scope expansion/removal and publication remain separately reserved. This documentation cleanup authorizes no push, release update, merge, branch deletion or overwrite of frozen packages.

## Historical evidence

Use the [release history](archive/release-history-2026-09-13.md), [checkpoint index](archive/README.md#september-13-documentation-consolidation), [frozen V3 report](v3-release-report.md) and [rollback packages](https://github.com/NerdyGeneral/BranchWars/blob/v3.0.0/releases/v2-stabilization-rc1/README.txt). Preserve unique failed tests, saves, reference builds and their matching manuals.
