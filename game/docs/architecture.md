# Architecture and repository maintenance

Updated: 2026-09-05. This is the current implementation plan; the user's separate, untracked architecture proposal is preserved, not silently adopted as current evidence.

## Stabilization foundation

- The active package is `game/`, with repository-root launchers. HTML/server filenames and save rules are preserved. The relocation itself did not change simulation bytes; later refactors preserve behavior through fixed gates.
- Twenty committed seeded campaign expectations cover four legacy scopes, both funding generations, regional pilots, services, management, customer needs and goodwill. Hashes cover the full state, chosen plans, public views and each turn, not just an end score.
- Three preserved half-ready saves exercise the real importer and continued play. Existing reference-engine comparisons remain active.
- A conservative textual override ceiling detects increases in assignments to declared engine function names and their exported engine API. Data-member writes are excluded. It is a smoke check, not a full JavaScript parser or proof that every form of indirection is forbidden.
- One non-interactive developer command runs fast or full validation. Windows full checks retain the LAN suite. GitHub PR checks use pinned actions, read-only contents access and no relay credentials, following [GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).
- The foundation recorded existing runtime debt rather than fixing it. Subsequent batches removed the creation, project-validation, monthly-resolution, project-completion and AI/validation stacks. Other feature/instrumentation adapters remain. The committed ceiling is the machine-checked count; it also includes explicit API assignments, not just wrappers.

## Shared project rules: implemented

Project prices, restrictions, draft spending and execution eligibility now have shared engine entry points. UI project/service cards, the core AI project selector, peer plan validation and execution use these rules rather than maintaining separate project eligibility formulas.

- `projectTerms` returns intrinsic price, duration, capacity and restrictions for a selected focus market.
- `projectPlanStatus` checks the combined initiative list, cash/capital reservation, execution capacity, office conflicts and service deployment conflicts. It does not replace every product or service-policy validator.
- `projectTargetIssue` handles market availability in full-game and seat-relative public views.
- `projectStartStatus` rechecks mutable cash, capacity and restrictions at execution. The original capital reserve remains a planning constraint; applying it again after executive events would change accepted campaign rules.

Twelve function reassignments are removed: `projectCost` 1→0, `projectBarred` 4→0, `planBudget` 2→0, `validatePlan` 4→0 and `startProject` 3→2. The two remaining start wrappers preserve accounting-source and causal-ledger instrumentation. The override ceilings were lowered accordingly.

Project choices now explain the shared blocking reason, selected initiatives remain removable from an invalid unlocked draft, and recruiting checks the full capital-aware budget. Unknown/inherited project identifiers are rejected without producing non-finite quotes. These are input/UI repairs, not a balance revision.

The targeted rule suite compares 1,296 cases against the preserved pre-refactor engine, including valid-plan acceptance, quotes, restrictions and execution side effects. It also executes real renderer/handler functions in DOM sinks; this is not screenshot or physical multiplayer acceptance. Fixed campaign and half-ready save expectations are unchanged. See [release status](release-status.md) for full-run evidence.

## Campaign creation and migration: implemented

`createGame` is now one explicit coordinator. It validates creation options in the original order, creates the seeded base campaign, then initializes pilot accounting/geography, regional offices and books, credit/funding/products, service contracts, management and customer relationships in order. The fifteen feature initializers sit beside their domain code; there is no mutable registration system or captured chain of prior constructors.

- All sixteen `createGame` reassignments are gone, and its override ceiling is zero.
- Pilot scope/funding defaults, optional-stage dependencies, validation errors, object field order and ambient/world random consumption are preserved. Unsupported flags still fail even when their feature would otherwise be disabled.
- `migrateCampaign` lives in the engine. It clones the incoming save, validates ledger/accounting/funding versions, applies existing legacy repairs, then restores or validates the simulation state. Save formats and campaign rule versions are not changed.
- Repair is separated into metadata, player, portfolio and rivalry helpers. These helpers mutate their argument; only the migration entry point guarantees a private clone. Browser import/continue retain three thin compatibility adapters and no repair override.
- Tests compare 1,387 creation cases and 41 imports with the frozen pre-refactor implementation. Coverage includes every on/off combination of ten pilot stages, both funding generations, all local/network modes, either seat's sealed plan, v6.0–v8.4 labels, corrupted saves, idempotence and non-mutating rejection.

Moving player repair into the engine exposed a textual guard false positive: `player.stats = ...` is not an override of the accounting `stats` function. The guard now excludes data-member assignments while retaining exported engine API replacements; sensitivity tests cover both. Corresponding false-positive ceilings were lowered, not counted as additional removed wrappers.

## Monthly resolution and project completion: implemented

`operate` now explicitly sequences term maturities, promotion repricing, scheduled principal, production/accounting, local settlement and reports. Customer intake and world contexts have explicit cleanup; only the legacy demand calculation consumes world randomness. `resolveCycle` owns ledger context and symmetric frozen market quotas, executes the monthly steps, retains account snapshots and cleans up. No captured chain of previous implementations remains for these entry points.

`finishProject` dispatches service/product deployment directly, then owns deposit/credit cohort transfers, market context and accounting settlement. Regional office work and re-entry rules are explicit settlement steps; facility effects remain separate from financial settlement. These are not new game rules: sequencing, cancellation messages, rounding and retained journals are preserved.

The three ceilings are zero. This removes ten operating wrappers, nine completion wrappers and three resolution wrappers; the separate operation API assignment was also folded into the original export object. The new runtime comparison suite exercises 192 operations, 864 completions and 64 fault/recovery pairs against the frozen implementation. Fixed campaigns and save continuations pass unchanged. The complete four-step batch passes 47/47 local Windows regression invocations; paired campaign audits show no outcome drift in 2,880 sampled turns. Exact reports and acceptance limits are in [release status](release-status.md).

## AI and policy validation: implemented

`chooseOpenBot` prepares one intent through named reserve, regional, funding, product, contract, service, management and customer stages. It no longer captures previous planners. Market scope and the separate AI random stream retain their original boundaries. This does not revise the AI's strategy or promise that every stressed draft is optimal.

`validatePilot` explicitly runs fifteen domain save validators in order; an absent optional feature returns from its own check, not from the whole validation sequence. `validatePortfolioPlan` runs product normalization, deployment, service and management rules in their original order. UI/network submission and AI still use the same engine entry points. All three override ceilings are zero, removing 31 more replacement layers. The runtime suite additionally compares 64 AI preparations, 160 policy normalizations and 416 damaged-save validations against the frozen implementation.

## Modular source and portable build: implemented

The editable source is `src/`; `BRANCH_WARS.html` is generated. `src/manifest.json` explicitly lists the ordered inputs. `node game/tools/build_game.js` assembles the existing game without third-party build packages, runtime imports, CDNs or external assets. The original game filename, two inline script scopes and launcher/server routes are retained. Players can still copy only the HTML file and play locally.

| Source area | Responsibility |
|---|---|
| `src/content/` | Base catalogs, regional geography, anchor clients and customer-market definitions |
| `src/engine/` | Simulation domains, accounts/books, creation/import, shared rules and explicit coordinators |
| `src/ui/` and `src/styles/` | Lobby, drafts, renderers, event wiring and the existing CSS cascade |
| `src/network/` | Repository relay, LAN, peer codes, Direct P2P and protocol/seat handling |
| `src/persistence/` | Local save/import/export adapters; relay checkpoint logic remains beside its transport |
| `src/page.html` | Page markup with build slots, not a second executable implementation |

There are 80 listed inputs including shells, manifest and markup (four were added for specialists, then three for household engine rules, UI and styles). These are **ordered build-time source modules sharing private lexical scopes**, not isolated ES modules. `BWEngine` is the engine/browser boundary. The engine runs headlessly without DOM, storage, timers or transports; the client still shares session/draft state and some transport functions call presentation helpers. File separation does not erase that coupling or the preserved CSS override cascade.

The extraction was checked byte-for-byte after line-ending normalization: engine, client, styles and markup were unchanged except a generated-file comment. The new coordinators were then formatted for readability. Fixed behavior and save tests remain authoritative; no golden/reference engines were regenerated.

Both fast/full gates check source freshness before testing. The builder rejects missing, duplicate, unwired, escaping or syntactically invalid inputs; check mode never overwrites the artifact. Build tests cover repeated assembly, all-input CRLF parity, output/source drift, malformed slots, external code/style dependencies and DOM-free execution. Full-run fingerprints now include every source input and the builder.

## Remaining architecture debt

The specialist gameplay slice uses explicit creation, monthly, AI and validation
calls in the existing coordinators, not new runtime replacements. Role content,
workforce rules, presentation and styles have separate source files.
Premium payroll is settled once, and elective training affordability is rechecked
after bank production before expense posting. Sealed plans, migrations and
owner-only views carry the versioned workforce state; all three lobby transports
require workforce support from the peer before a v8.5 game starts.

The household ownership slice follows the same explicit coordinator pattern.
Customer movement calls the segment-book transfer functions directly; monthly
retention settles before maturities and production, with the same settlement
routine used on private preview clones. Household counts are conserved across
both banks and outside institutions; no monthly reconciliation recreates them.
The v8.6 owner book and sealed service mandate have dedicated validators and
private-view filtering. All three lobby transports require household support.
Deposits remain market-level pools, not segment-owned accounts. This adds no new
runtime replacement assignments and does not solve the shared transaction-context
debt described below.

The approved four-step batch is implemented, not the end of all architecture work. Remaining priorities are explicit transaction context (replacing the shared market/credit/deposit context variables), flattening other feature and ledger adapters, typed plan/state contracts, a cleaner client session/transport interface, and renderer/CSS consolidation during the separate UI batch. The current guard permits 76 remaining textual assignments across other functions; this is a conservative debt count, not 76 independently verified defects. Do not turn this into a mutable plugin-registration system.

Refactors must preserve fixed expectations; balance changes require separately reviewed expectation diffs and rule-version decisions. Passing AI campaigns does not establish human balance or game depth.

## Branch history and recovery

At cleanup, `main` was `a5c46364574b7a6216833f0ef3e918a711c1a2ff` (merged PR #6). Seven old branch names were archived with their exact tips before removal. Ancestry counts are not claims that unmatched changes should be replayed onto the modern game.

| Former branch | Preserved tip | Commits outside main at audit |
|---|---|---:|
| `claude/capability-investment` | `8ee7075272c786c509a8da82bb6a006cfc7aed36` | 0 |
| `claude/direct-p2p-turn-bug-4ugb4d` | `530797eec12db7914a4d77109a77d4ccf9ab4566` | 3 |
| `claude/emergent-doctrine` | `d88a51e78ea111edd6f8e54a0953892f1a04a1ad` | 0 |
| `claude/execution-capacity-and-hiring` | `ff4bd078978715b5fde10e09d6284125ee176b10` | 0 |
| `codex/github-setup-guide` | `01fcfc156426cc5dea29b38ab51dfe03d059f410` | 3 |
| `codex/multiplayer-reliability` | `d49528741fa24f74acd4984809233e687beed6a2` | 1 |
| `codex/open-ended-campaign-v8` | `7967b5ddbddaaba1b1245b602f750ae136b1781e` | 2 |

Each tip is available as `archive/2026-09-05/<former-branch>`. One example:

```text
git fetch origin --tags
git switch -c recovery/direct-p2p archive/2026-09-05/claude/direct-p2p-turn-bug-4ugb4d
```

The multiplayer-reliability unmatched commit is patch-equivalent to a commit in main; the other divergent histories were retained rather than assumed redundant. Tags can restore every retired branch.

Future work uses short-lived `feat/`, `fix/`, `refactor/` or `docs/` branches from current main. Pending review, the stack is `refactor/stabilization-foundation` → `refactor/shared-project-rules` → `refactor/campaign-lifecycle` → `fix/multiplayer-lobby` → `refactor/explicit-runtime` → `feat/specialist-workforce` → `feat/household-retention`. Review the foundation first, then retarget each dependent PR to main after its prerequisite merges. No PR is automatically merged. Do not reuse merged branch names for subsequent releases.

## Local folders and compatibility

The outer dated download folders, ZIP backups and user notes have not been deleted. Only the tracked package directory changed to `game/` (untracked files inside it moved with it). The saved desktop-project path still points at the existing repository.

Use root launchers after updating. Old filesystem shortcuts into the versioned package need retargeting. Export saves before changing browser origins/URLs; this batch does not copy or erase browser storage or modify running multiplayer rooms.

Do not rename frozen report/reference files just for style. Generated local reports are ignored until deliberately selected for publication. See [contributing](../../CONTRIBUTING.md) for commands and working rules.
