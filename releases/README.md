# Branch Wars version catalog

The main game and its root launchers remain unchanged from
`10652ccec4712ab53738761c88f1364f960cce3a`. Do not replace `game/` with an
expansion merely to make a release available. Each package below is separate.

## V2 — Company Banking stabilization RC1

- [Download ZIP](branch-wars-v2.zip), [unpacked player files](v2/README.txt),
  [matching player guide](v2-player-guide.md).
- New Financial Group campaigns: rules 2 / save 9.1. Existing rules stay fixed.
- This is the multiplayer/storage-stabilized V2, not the earlier unpatched V2
  package. The original package remains in development history unchanged.
- Exact source and guide: [V2 checkpoint 8338e98](https://github.com/NerdyGeneral/BranchWars/tree/8338e98b0c20cbd6feb85e343497d09271f815b8).
- [Original V2 technical evidence](https://github.com/NerdyGeneral/BranchWars/blob/8338e98b0c20cbd6feb85e343497d09271f815b8/game/docs/release-status.md).
  That evidence is historical, not a fresh full gameplay audit in this catalog task.

## V3 — V3.1 long-campaign stability update / Financial Group preview

- [Download ZIP](branch-wars-v3.zip), [unpacked player files](v3/README.txt),
  [download the complete 51-page field manual](https://github.com/NerdyGeneral/BranchWars/raw/refs/heads/main/releases/branch-wars-v3-manual.pdf),
  [manual ZIP fallback](https://github.com/NerdyGeneral/BranchWars/raw/refs/heads/main/releases/branch-wars-v3-manual.zip),
  [current changes and debug/balance report](v3-release-report.md).
- New Financial Group campaigns: rules 7 / save 9.6. Existing rules stay fixed;
  both friends need the same supported build. Export before updating.
- Exact current source: [V3.1 checkpoint c721ede](https://github.com/NerdyGeneral/BranchWars/tree/c721ede4245016853f35c30761d9ff35971b154f).
- The game ZIP is byte-for-byte the tested V3.1 candidate: 185 Windows checks,
  eight matched 480-month campaigns / 328 exact replays, and a separate 16-case
  standard release-balance suite. Real two-computer GitHub acceptance remains
  outstanding; these checks do not guarantee zero bugs or enjoyable balance.
- Repairs address paid staffing/execution conflicts, productive lending,
  funded corporate circulation, facility investment forecasts, reserves and
  related save/network/UI behavior. See the report for before/after evidence.
- The PDF places six current revision pages before the full original 45-page
  guide. All 74 original index links remain valid. Older latest-Group6 references
  belong to the original section; current revision instructions supersede them.
- [Original V3 package and guide](https://github.com/NerdyGeneral/BranchWars/tree/263ba69b71e01dc0f9c5cb01b57877e2ef8ff02f/releases)
  remain recoverable at the previous immutable catalog commit. The
  [v3.0.0 tag](https://github.com/NerdyGeneral/BranchWars/tree/v3.0.0) is unchanged.
- Remaining limits include opening pace, thin margins, large save sizes and
  human multiplayer/fun acceptance. Deposit dominance remains legitimate.
  National Empire and underwriting remain deferred.

## Multiplayer and saves

### Opening the manual

The full PDF is 51 pages. The [GitHub preview](branch-wars-v3-manual.pdf) initially
renders five and uses a **More Pages** button to load the rest. This is not a
five-page upload. Use the full download link above to open the manual in your
PDF reader, or extract the ZIP fallback if the embedded preview fails.
Both downloads contain the same verified updated PDF. No original handbook page
has been removed; six clearly marked revision pages are prepended.

### Keeping your campaign

Both players should download the same edition. Export before switching folders,
origins or versions; retain the old package and save. In multiplayer the host
owns the authoritative export. Do not share tokens or publish personal saves.
The included LAN server is for trusted local networks, not public hosting.

## Repository and pull-request status

At inspection on September 8, all 18 existing pull requests were already closed
and merged; none remained open. All 18 were also checked for inline review
threads; none were present. Most were stacked into intermediate branches.
"Merged" therefore did not mean that the latest game was the default `main` game.
The final intermediate `fix/multiplayer-lobby` tree matched the V3 tag, while
`main` retained the earlier game. This additive catalog deliberately preserves
that distinction rather than merging the whole development stack over it.

Historical pull requests, source branches, V2 history and the V3 tag are retained;
none is deleted or rewritten. The older V2 PR description is clarified separately
to identify the later V3 additions without relabeling old test results as V3 tests.

## Integrity and maintenance

[catalog.json](catalog.json) pins source revisions, package identities and guide
hashes. Each player folder has an exact six-file inventory and its own manifest.
Run `node tools/check-release-catalog.js` from the repository root to verify
the preserved default game, both packages, ZIP contents, guide hashes and links.
The same check runs in CI alongside the existing main-game gates.
