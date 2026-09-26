# Releases

Only the current V4 package is kept here. V2 and V3 packages were removed to keep the
repository small; they remain reachable from their git tags and from this repository's
history.

## V4 rc5 (current prerelease)

The rc5 package is published as a GitHub release asset rather than stored here:
[branch-wars-v4-rc5.zip](https://github.com/NerdyGeneral/BranchWars/releases/download/v4.0.0-rc5/branch-wars-v4-rc5.zip).
It repairs rc4's save loader, which stripped Risk & Capital and third operating models from a
Core save on reload, and keeps research rules through a rematch.

- [What rc5 repaired](v4-rc5-notes.md) and its [verification summary](v4-rc5-verification.json)

## V4 rc4 (frozen)

- [Unpacked player files](v4-rc4/README.txt) -- kept for reference. Do not use it for a
  campaign you intend to reload: see the loader defect above.
- [Research design, and what is still rough](v4-rc4-notes.md)
- [Quick-start guide](branch-wars-v4-guide.md)

Core campaigns carry save version `8.20`; Expanded carries `9.33`. Un-opted Core remains
`8.19`. Every earlier save format still loads.

`catalog.json` records the hash of each published portable build.

## Retained as test fixtures

`branch-wars-v3.zip` is not an advertised download. It is a compatibility reference build
that `v31_version_boundary` loads to prove old peers and old saves are still refused or
migrated correctly. The V2 build that `agency_legacy_compat` and
`agency_peer_compat` load for the same reason is kept with the other reference builds as
`game/reports/reference-builds/BRANCH_WARS_v2_release_b041ed53.html`. Deleting either breaks
those tests.

`v4/` (frozen rc2) and `v4-rc3/` are fixtures for the same reason. `income_review` replays
the rc2 engine; `research_bot` proves older campaigns keep rc3's exact bot choices and random
draws; `package_release` verifies both as pinned historical packages. Their bytes are pinned
by hash and must not be rebuilt.
