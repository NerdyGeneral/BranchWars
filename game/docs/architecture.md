# Architecture and repository maintenance

Updated: 2026-09-05. This is the current implementation plan; the user's separate, untracked architecture proposal is preserved, not silently adopted as current evidence.

## Stabilization foundation

- The active package is `game/`, with repository-root launchers. HTML/server filenames, simulation bytes and save rules are unchanged by this relocation.
- Twenty committed seeded campaign expectations cover four legacy scopes, both funding generations, regional pilots, services, management, customer needs and goodwill. Hashes cover the full state, chosen plans, public views and each turn, not just an end score.
- Three preserved half-ready saves exercise the real importer and continued play. Existing reference-engine comparisons remain active.
- A conservative textual override ceiling detects increases in assignments to declared engine function names. It is a smoke check, not a full JavaScript parser or proof that every form of indirection is forbidden.
- One non-interactive developer command runs fast or full validation. Windows full checks retain the LAN suite. GitHub PR checks use pinned actions, read-only contents access and no relay credentials, following [GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).
- Existing runtime debt is not fixed by these checks. The initial counts include 16 `createGame`, 14 `chooseOpenBot`, 9 `operate`, 9 `finishProject` and 4 `validatePlan` reassignments.

## Next: staged engine cleanup

1. Trace initiative eligibility, costing, reservation and execution together. Extract a shared rule result consumed by UI, AI and peer validation; recheck mutable resources at execution and preserve explicit, uncharged cancellation notices.
2. Flatten one override family per behavior-preserving commit. Start with the validation/cost family after the shared-rule tests; then creation/migrations, operations, project completion and AI. Lower the committed override ceiling when a layer is removed.
3. Extract pure simulation/content modules only after the behavioral baseline remains stable. Separate UI, transport and save adapters at explicit boundaries.
4. Generate a portable single-file release from source only when a reproducible build and freshness check are in place. Do not create empty `src/` or `dist/` folders or duplicate editable sources in anticipation.

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

Future work uses short-lived `feat/`, `fix/`, `refactor/` or `docs/` branches from current main. This batch uses `refactor/stabilization-foundation`; it is not automatically merged. Do not reuse merged branch names for subsequent releases.

## Local folders and compatibility

The outer dated download folders, ZIP backups and user notes have not been deleted. Only the tracked package directory changed to `game/` (untracked files inside it moved with it). The saved desktop-project path still points at the existing repository.

Use root launchers after updating. Old filesystem shortcuts into the versioned package need retargeting. Export saves before changing browser origins/URLs; this batch does not copy or erase browser storage or modify running multiplayer rooms.

Do not rename frozen report/reference files just for style. Generated local reports are ignored until deliberately selected for publication. See [contributing](../../CONTRIBUTING.md) for commands and working rules.
