# Releases

Only the current V4 package is kept here. V2 and V3 packages were removed to keep the
repository small; they remain reachable from their git tags and from this repository's
history.

## V4 rc4 (current)

- [Unpacked player files](v4-rc4/README.txt) -- keep the folder together and open
  `OPEN_BRANCH_WARS.bat`, or `BRANCH_WARS.html` directly.
- [What changed, and what is still rough](v4-rc4-notes.md)
- [Quick-start guide](branch-wars-v4-guide.md)

Core campaigns created from this build carry save version `8.20`; Expanded carries `9.33`.
Un-opted Core remains `8.19`. Every earlier save format still loads.

`catalog.json` records the hash of each published portable build.

## Retained as test fixtures

`branch-wars-v3.zip` and the `V2 release/` folder are not advertised downloads. They are
compatibility reference builds that `v31_version_boundary`, `agency_legacy_compat`,
`agency_peer_compat` and `expanded_edition_network` load to prove old peers and old saves
are still refused or migrated correctly. Deleting them breaks those tests.
