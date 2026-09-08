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

## V3 — Regional Command / Financial Group preview

- [Download ZIP](branch-wars-v3.zip), [unpacked player files](v3/README.txt),
  [download the complete 45-page field manual](https://github.com/NerdyGeneral/BranchWars/raw/refs/heads/main/releases/branch-wars-v3-manual.pdf),
  [manual ZIP fallback](https://github.com/NerdyGeneral/BranchWars/raw/refs/heads/main/releases/branch-wars-v3-manual.zip),
  [eight-hour changes and debug/balance report](v3-release-report.md).
- New Financial Group campaigns: rules 6 / save 9.5. Existing rules stay fixed.
- Exact source: [immutable v3.0.0 tag](https://github.com/NerdyGeneral/BranchWars/tree/v3.0.0),
  commit `ee37b6865af71be20c35ac3b4f41b0519bf9d650`.
- 167 Windows regression suites and 1,920 release-balance months passed for this
  exact runtime before publication. Additional same-engine Group6 tests are
  detailed in the report. No new gameplay changes were made for this catalog.
- Remaining limits include AI origination, ATM-heavy networks, late corporate
  cash circulation, and real two-computer acceptance. National Empire and
  underwriting remain deferred.

## Multiplayer and saves

### Opening the manual

The full PDF is 45 pages. The [GitHub preview](branch-wars-v3-manual.pdf) initially
renders five and uses a **More Pages** button to load the rest. This is not a
five-page upload. Use the full download link above to open the manual in your
PDF reader, or extract the ZIP fallback if the embedded preview fails.
Both downloads contain the same verified PDF, with no content removed or changed.

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
