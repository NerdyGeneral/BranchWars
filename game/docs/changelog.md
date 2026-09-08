# Changelog

## V2 stabilization RC1 — local technical gates passed

- Reinforced LAN authentication, JSON/timeouts, validation and ordered polling.
- Immutable LAN/GitHub retries and cycle-fenced modern recall requests.
- Lossless large-campaign browser-save/checkpoint compression; raw legacy records
  remain readable. Corrupt or mismatched storage envelopes are rejected before
  adoption. Exported campaign JSON and game rules remain unchanged.
- Reproduced a real browser quota failure on a 14.29 MB campaign; the repaired
  3.17 MB browser record survived reload with the complete state intact.
- Fixed premature generated-URL expansion in the portable Windows launcher;
  added native batch-parser coverage and safe missing-address/URL fallback.
- Adversarial regressions, native authentication tests and bounded six-strategy lab.
- Consolidated active architecture/roadmap/status; preserved history.
- Added a six-file player-only candidate beside the unchanged original V2 package;
  clean extraction and source-tree checks keep local-only files out of releases.
- No economics, campaign versions or optional defaults changed.
- 115 final Windows suites plus a separate guest-checkpoint regression passed;
  the additional guest check is included in subsequent full CI runs.
- 72 strategy campaigns / 11,498 months completed, including eight 480-month
  campaigns; no economic tuning. One legitimate capital-driven receivership.
- Real two-computer acceptance pending; release candidate, not stable certification.
- Hosted Linux run 21 reached its 15-minute job limit during passing regressions.
  Increased that allowance to 30 minutes; no test was removed or skipped.
- The hosted Windows sample took 14.4 minutes versus 5.6 locally for the same
  tests. Its full-job allowance is 90 minutes; existing per-test limits remain.

## V2 Connected Company Banking — September 7, 2026

Published at `d82eebc` in the preserved V2 release folder. Operating companies,
funded service fees/receivables/collections/losses, parent capital and simultaneous
lending. Financial Group rules 2 / save 9.1; historical campaigns unchanged.

## Earlier work

Pricing/programmes, modular registry/lobbies, onboarding/customer effects,
workforce, credit and regional systems remain. See the [archive](archive/README.md)
for dated decisions and [release status](release-status.md) for current evidence.
