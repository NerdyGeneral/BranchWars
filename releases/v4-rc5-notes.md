# Branch Wars V4 rc5 — Core Research & Stabilization

This prerelease repairs the Core research playtest and includes the verified standalone game package. Earlier frozen releases are preserved.

- Paid research and permanent operating models survive save/reload. Rematches preserve the campaign's rules and reset earned progress correctly.
- Core bots can adopt all 18 operating models when earned or funded and respect research product gates. Older campaign profiles retain their earlier behavior.
- Research descriptions match actual effects. Strategy opens the visible commercial-service controls in campaigns that use Customers.
- Research regressions are included in the maintained checks. Package verification checks the actual current source and editions.

Download [branch-wars-v4-rc5.zip](https://github.com/NerdyGeneral/BranchWars/releases/download/v4.0.0-rc5/branch-wars-v4-rc5.zip), extract it and keep all six files together. On Windows run `OPEN_BRANCH_WARS.bat`; other systems can open `BRANCH_WARS.html` in a browser. The Windows LAN host uses `OPEN_LAN_GAME.bat`.

**Core 8.20 is opt-in:** click **Core edition** and confirm even if selected. In Research, check for six capabilities including **RISK & CAPITAL**. Untouched setup remains Core 8.19; confirming Expanded starts 9.33. Imports and rematches retain saved rules.

Export saves before changing folders or browser origins and keep the previous package. Both players should use the same version. Research already removed by the original rc4 loader requires an earlier intact export to recover it.

**Verification:** all **278 exact maintained standard commands** have passing evidence across qualified frozen runs and two scoped retests. The original full gate remains failed at **3/44**: its complete 214-entry baseline had 213 passes and one obsolete engine-pin assertion. The pin was independently justified, updated and retested. `fullGatePassed:false` and `continuousStandardGatePassed:false` remain intentional; this is complete command coverage across runs. ZIP contents, fresh extraction and current-profile runtime smoke passed. Claude Code independently reviewed source changes and final evidence and closed the scoped local-package review. See the [public verification summary](v4-rc5-verification.json) and [Codex-prepared Claude review summary](../CLAUDE_CODE_REVIEW.md).

Browser rendering, human play, physical two-computer acceptance and strategic balance remain unverified. Automated Windows LAN checks passed, but do not establish physical multiplayer acceptance. Model reachability is not strategy-strength evidence; sustained Expanded recovery and conventional-lending balance remain open. The maintained release-balance configuration uses legacy rules, not current-edition balance. Full Expanded blueprint completion is outside this prerelease.

ZIP SHA-256: `38a734cfd98e14d8512108a392a286581a0b4774fb3376f614e98e12dd60c672`.

Playable HTML SHA-256: `26d9603689678aaed44ffa2c0981b65877b62cc1d3f78aa2cb43579fec1e0af3`.
