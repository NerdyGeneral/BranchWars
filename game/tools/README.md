# tools

The [documentation index](../docs/README.md) is the starting point. Run
`node tests/docs.test.js` from the game folder to verify document naming and
local links; this gate also runs in `tests/capture_baseline.js`.

## Stabilization gates

From the repository root:

```text
node game/tools/check.js          fast checks
node game/tools/check.js --full   complete Windows regression and balance audit
```

The fast gate includes committed behavioral expectations, saved-game continuation,
override ceilings, reference freshness, docs and transport. It does not replace the
full release gate or physical two-computer testing. `RUN_TESTS.bat` still runs the
complete suite. Golden updates are deliberate: see [contributing](../../CONTRIBUTING.md).
The original save fixtures must not be overwritten.

## `build_game.js`

Edit `src/` modules, then run these commands from the repository root:

```text
node game/tools/build_game.js
node game/tools/build_game.js --check
```

`src/manifest.json` lists ordered engine/content, UI, network, persistence and style inputs. The builder produces the existing portable `BRANCH_WARS.html`; playing still requires no Node, bundler, package installation or external assets. Check mode is read-only. Missing/duplicate/unlisted modules, invalid script syntax and stale output fail validation. CRLF and LF inputs produce identical LF output.

The engine and browser shell have separate private scopes connected by `BWEngine`. Within each scope these are ordered source modules, **not isolated ES modules**; legacy feature adapters and browser session state still share bindings. This is documented debt, not a claim that file extraction removed all coupling. See [architecture](../docs/architecture.md).

## `build_reference.js`

Builds `../docs/game-reference.md` from the live engine.

```
node tools/build_reference.js           rebuild
node tools/build_reference.js --check   fail if the committed file is stale
```

Every number, name and description in the generated sections is read out of
`BRANCH_WARS.html` at build time, and several sections embed the actual function
source, so the reference cannot describe rules the game no longer has. Prose
lives in `reference-template.md`; that is the only part written by hand.

`--check` runs inside `tests/engine.test.js` and at the top of `RUN_TESTS.bat`,
so changing a cost without rebuilding is a test failure rather than something to
remember. To add a generated section, add it to `sections` in the builder and
place a `<!--{{TOKEN}}-->` marker in the template — the builder fails if a token
is unknown or if a generated section is never placed.

## Measuring balance without fooling yourself

Campaigns are deterministic: `createGame({ seed })` replays identically. Use it.
Every pitfall below cost real time in past sessions.

**Pair within a snapshot.** Comparing medians across independent campaigns is far
too noisy. An unpaired test once said branches produced no lift at all; paired
against the same mid-game state the same change was +11M to +42M deposits, all
significant.

**Hold the budget constant.** Capability lanes looked worthless when measured with
building disabled — the project-multiplier lanes had nothing to multiply — and
negative when measured with building enabled, because capability spend crowded
out branches. Fund the lane out of band (hand the arm exactly the cash it
invests) to isolate it.

**Equalise everything except the variable.** A playstyle matchup matrix inverted
almost completely — one archetype went from 10% to 82% — once every archetype was
allowed to build. The first version was measuring builders against non-builders.

**Check monotonicity.** A price sweep that does not improve as price falls is
noise. The network capability lane failed this (68 → 117 → 61 → 134 with error
bars to ±137) and was correctly left untuned.

**Watch for reverse causality.** Anything read from a quantity that grows because
you are winning — headcount, cumulative hires — will make the winner "become"
that thing late, and it will look like the strongest strategy. Share-of-spend
measures survive this; absolute totals do not.

**Report error bars, and re-run.** If the ordering shuffles between runs, that is
parity, not a defect to tune.

**Watch the realm.** The engine runs under `vm.runInNewContext`, so arrays derived
from game state carry the sandbox's prototypes. `assert.deepStrictEqual` against
a locally built array fails on identical contents.

## Reference points

Current expected values are in `../docs/game-reference.md` §12.
