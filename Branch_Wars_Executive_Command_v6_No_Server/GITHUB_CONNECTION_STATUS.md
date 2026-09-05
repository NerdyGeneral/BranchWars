# GitHub connection reinforcement

## Scope and diagnosis
This patch changes the client transport only. The engine script is byte-for-byte unchanged after newline normalization from the pre-repair build. No gameplay phase was advanced.

The user's actual failed match was not inspected: no error screenshot, room data, token, or live GitHub connection was supplied during this repair. These are reproducible code failure paths, not a confirmed diagnosis of that particular session:

1. The old host trail retained up to 20 complete public-state snapshots. The Contents API omits inline content for files over 1 MB under its object media type. A growing room could therefore look unreadable to the old client.
2. The guest's 30-second acknowledgement timer deleted its sealed plan/nonce while a commitment might already exist at the host. The corresponding reveal could then never complete.
3. Fetch and response-body reads lacked a timeout. Rate-limit retries ignored server cooldown headers. Async reveal verification was not awaited by polling.
4. There was no persisted repository-session recovery; ordinary Continue changed a linked save into pass-and-play.

## Implemented
- Only the latest replacement state is kept; command messages are retained until acknowledged by the other side. The pending-command safety limit is 100 rather than silently dropping commands.
- Oversized existing room files use authenticated raw-content fallback through the same configured API, not an external download URL.
- Requests and their response bodies have a 20-second abort timeout.
- Primary/secondary rate limits set a shared cooldown honoring Retry-After and reset headers, with at least 60 seconds. Manual Retry does not bypass it.
- Writes are spaced by at least 1.1 seconds. Polling is conditional at a nominal 5-second interval, with bounded backoff for ordinary failures.
- Authentication/permission failures pause rather than continually hammer the API.
- Lost accepted write responses reconcile sequence and message identity, including an in-flight state superseded locally.
- Conflicting newer writers pause; occupied guest seats cannot be silently overwritten by a fresh Join.
- Polling awaits async message handling and advances its cursor afterward. Departed sessions cannot publish stale async completions into the next session.
- Sealed plans survive acknowledgement delays; duplicate old reveals cannot advance the engine twice. Recall waits for host confirmation.
- Session recovery stores the host campaign or guest view, queue/cursors, and commitment data in sessionStorage. The token is excluded from this checkpoint and retains its separate existing session-token storage.
- Added Resume Repository Session in setup and Retry Repository Link in the match.
- Status distinguishes an update stored at GitHub from a peer message received; a successful write is not proof that the friend is online.
- No commit, push, live repository writes, credentials, firewall changes, or release packaging performed.

## Recovery instructions
1. If the old stalled game is still open, the HOST should EXPORT before refreshing or replacing the file. This build cannot retrospectively create a recovery checkpoint in an old build.
2. Both friends should use the updated BRANCH_WARS.html, one tab per seat.
3. For an interruption in the updated build, leave the tab open; retries retain the same sealed plan. Use Retry Repository Link if necessary.
4. After a reload, choose Repository Link > Resume Repository Session in the same tab and at the same address.
5. For an expired/rejected token, return to setup, enter your own replacement token, then Resume. Do not open a new room to resume an existing seat.
6. Session recovery is not cross-computer/cloud backup. Closing the tab, clearing storage or changing origin may lose it. Keep host exports for long campaigns. Importing a campaign backup still uses the existing pass-and-play recovery path; it does not reconstruct an old GitHub room/seal.

## Verification
Final HTML SHA-256: 6320d68aaa72cbdfcf60d4f29f41a07ece249e62997b1a29c6a8791fdac3e23f

- tests/github_resilience.test.js passed: oversized room fallback, snapshot compaction, cooldown, auth pause, timeout, old-session response, writer conflict, seat ownership, seal timeout, engine commit/reveal, duplicate reveal, reload preservation, ordered asynchronous polling.
- Two simulated GitHub clients completed 12 actual engine turns through the real read/write/queue/message functions: 61 accepted writes, 8 deliberately lost accepted-write responses, no duplicate turn or seal loss. HTTP is simulated; this is not a live GitHub acceptance test.
- Existing transport retry suite passed.
- Engine suite passed: 48 long-run campaigns plus validation and UI/transport contracts. Contract assertions were updated for captured-session naming and the explicit own-seat write guard.
- Save-integrity suite and PowerShell LAN relay suite passed.
- Browser recovery setup rendered at 1280px; missing-session action returned an actionable message with no console warnings/errors. This caught and fixed error text being erased by setup navigation.
- git diff --check passed (line-ending warnings only).
- The new suite is included in the baseline runner.

Not verified: the user's original failed room, a real authenticated GitHub match, physical two-computer/sleep-resume acceptance, browser storage quota exhaustion, and sustained campaign-length API usage. Simulated tests are not a guarantee against service outages or repository/account policy changes.

## API references checked
- [Repository contents API](https://docs.github.com/en/rest/repos/contents): inline/raw content behavior and write conflict semantics.
- [GitHub REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api): conditional requests, write spacing and rate-limit cooldowns.
