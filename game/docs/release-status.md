# Release status and known issues

Updated September 7, 2026. **V2 stabilization RC1 — local technical gates passed;
real two-computer acceptance remains pending.**
Publication and remote CI are tracked by [PR #18](https://github.com/NerdyGeneral/BranchWars/pull/18).

## Build identity

Published baseline: commit `d82eebcae019f94e74cbef2442e87650c77a1eea`,
portable `b041ed53394575872e32888f542232225e15b61deef73a07e7f20b020f25e1e4`.
The original V2 package is preserved.

Candidate portable SHA-256:
`1ad21f5b6822c07068e995a76f92ff1e0a4bc0c2ea695d7ed9006b9e10708c47`.
Candidate LAN server SHA-256:
`52ede2ed07ed4c6ba3fe3db4045a826f0a9a2ebc7fc8db2c48ccd9ad8e81f2d1`.
The simulation engine is byte-identical to V2. These repairs change no economics,
feature selections or campaign/save versions. New Group remains rules 2 / save 9.1.

## Repairs

- Vacant LAN guest seats no longer authenticate blank tokens. Tokens match exactly;
  malformed message envelopes are rejected before relay.
- Damaged/stalled LAN response bodies no longer masquerade as empty success.
- LAN polling is single-flight, ordered and acknowledged after processing.
  Replayed messages and stale handlers cannot advance a replacement session.
- LAN/GitHub retry queues snapshot the accepted payload.
- Modern recalls carry the cycle; stale recalls cannot cancel a newer plan.
  Failed GitHub recall enqueue does not mark a seal successfully recalled.
- The portable Windows launcher reads its generated URL after assignment;
  a detected LAN address no longer opens an empty target. Missing address/URL
  fallback and spaced/encoded paths have a native batch-parser regression test.
- Consolidated active status/roadmap/architecture; unique history remains archived.
- Large campaigns no longer rely on fitting raw ledger JSON into Web Storage.
  Lossless browser-only compression preserves history, ordinary exports and wire
  messages. Old raw records load; damaged/version-mismatched compressed records
  are refused before adoption. Failed writes preserve the previous checkpoint.

## Verification ledger

| Check | Current evidence |
|---|---|
| Baseline V2 | 113 Windows suites; 1,920 established, 864 paired and 960 Group stress months |
| Reproduced failures | Invalid LAN JSON accepted; unauthenticated vacant-seat poll accepted; both repaired |
| Focused multiplayer | Lifecycle, queue, ordering, stale-session/cycle, timeout/authentication/envelope tests pass |
| Three simulated transports | Group 1/2, pricing, dependencies, privacy, seals, duplicate/reconnect/checkpoint tests pass |
| Fresh Group matrix | Four scenarios × 24 = 96 months; no failures or early endings |
| Complete Windows gate | 115 suites pass on the final portable, including native launcher and regenerated 120-month storage recovery; deterministic outputs and source fingerprints unchanged. Separately passed guest-storage test is now suite 116 in CI |
| Existing paired Group lab | 20 campaigns / 864 months pass; all recorded outcomes exactly match V2 baseline |
| Expanded strategy lab | 72 campaigns / 36 paired matches / 11,498 months pass engine invariants. 63 short runs reach 120; one receivership at 98. All eight long runs reach 480 |
| Large-save repair | 14,289,988-byte generated campaign exceeds real browser quota as raw JSON; compressed local record uses 3,170,740 UTF-16 storage bytes and survives browser reload exactly |
| Checkpoint repair | Host full-game checkpoint uses 3,557,560 storage bytes; guest sealed-plan/view recovery, corruption refusal, raw legacy records and fresh handshake tests pass |
| Actual browser clients | Green LAN lobby, distinct banks/colors, settings reset readiness; submit/recall/resubmit; both reach cycle 2 |
| UI | All 11 workspaces render and show no page-wide overflow at 500px; no captured browser errors |
| Clean package | Final six-file ZIP extraction, manifest/served bytes and native LAN relay pass; portable and root launcher parser tests pass |
| Remote CI | See PR #18 checks for the published commit; independent hosted Windows/Linux verification follows local acceptance |

The default AI remains mortgage-biased. Six scripted strategies deliberately
stage different existing policies; this is not a human tournament or proof of fun.

### Measured regression comparison

The same 20 paired Group campaigns resolved 864 months with exactly matching
recorded outcomes before/after the repairs. Median two-bank planning was
489.9 ms before / 497.0 ms after; median settlement 166.0 / 163.3 ms; median
owner-view construction 7.96 / 7.93 ms. These measurements include concurrent
machine load and do not establish a speedup. No material regression was observed.
Desktop workspace navigation was approximately 294–318 ms including browser-test
roundtrip overhead, not a frame-time measurement.

The established 16-campaign / 1,920-month service-foundation audit recorded zero
skipped/cancelled initiatives, 826 initiatives, 1,051 competitive actions and
103 late service-provider changes. This is a narrower optional profile than
the new Group strategy matrix; it does not prove human comeback quality.

### Long-run balance findings

The expanded matrix covered four economies and cautious, aggressive, service,
commercial, digital and expansion controllers. It recorded 271 losing bank-months,
780 service-provider changes and 5,599 viable low-share bank-months (3,778 with
requested competitive actions, not necessarily successful counters). Peak deposit
share reached 99.16%; dominance is allowed and was not tuned away.

The lone early ending was the aggressive bank in a rate-shock campaign at month 98:
it led deposits ($85.26M versus $45.93M) but had negative equity and failed capital.
Its positive latest profit did not erase accumulated losses. No economic tuning
was justified by this audit. Average first-seat final shares were 49.65%, 45.93%,
49.51% and 57.60% across the four economies; this shows no consistent same-seat
leader across scenarios, not proof of perfect fairness or human counterplay.

Maximum owner view was 914,285 bytes. Raw saves reached 14.12 MB, exposing the
browser-storage failure repaired above. The 72-run matrix used portable
`459462f82fdc1535221269416bedafa4e93214a26119190d5fbc25958d0f14b8`;
the final storage-repaired build has the exact same engine SHA-256
`3568bcfe45e24add668f1bcd5445708bd81e21bb2ad75a199e7fbe9f9ac05f94`.
Real-browser compression of the separate 14.29 MB regression fixture took 388 ms;
instrumented VM compression/decompression took about 1.39 / 1.16 seconds.
These are measured samples, not guaranteed latency or unlimited storage capacity.

## Known limits

1. Physical two-computer LAN/GitHub/direct play and human enjoyment/comeback
   quality remain unverified. Local browser clients and simulations are not substitutes.
2. Long severe stress can close all six firms; replacement and takeovers are missing.
3. LAN rooms are in server memory. Keep both browsers/server open and export
   from the host. Live recovery after closing the server/reloading a client is
   not promised. GitHub offers tab-checkpoint Resume.
4. Direct P2P needs a permitted network route; no public relay is bundled.
   GitHub depends on token access, rate limits and service availability.
5. Forecasts cannot know sealed rival delivery/future shocks. Not every legacy
   external income stream has an individually modeled company counterparty.
6. No redesign, national expansion, staffed subsidiary, trading or underwriting
   was introduced by stabilization.
7. Browser storage remains quota-dependent. Export regularly and before using
   an older executable, which cannot read new compressed browser records.
   The Windows launcher parser is tested; default-browser file association
   still needs a manual check on the recipient's computer.

## Decisions / exceptions

No minor content/numeric approval blocks this goal. Record any unresolved material
failure before publication; do not hide it or tune away legitimate dominance.
Human multiplayer/playability remains an acceptance task.

Selected machine-readable evidence:
[final candidate](../reports/baselines/v2-stabilization-final.json) and
[72-campaign matrix](../reports/baselines/v2-stabilization-rc1.json).
The latter intentionally retains its pre-storage-repair artifact identity.

Use the [player guide](player-guide.md), [generated manual](game-reference.md),
[single roadmap](roadmap.md) and [changelog](changelog.md). The
[historical status archive](archive/release-status-pre-stabilization-2026-09-07.md)
preserves prior evidence without competing with this current status.
