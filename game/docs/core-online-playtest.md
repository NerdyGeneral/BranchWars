# Core online playtest

Use this checklist after the public HTTPS service has passed its health, room
and persistent-restart checks. Automated checks in one machine do not establish
how the game behaves across separate players' devices and connections.

## Prepare

Recruit four players on separate Internet connections. Include a phone if one
will be used for ordinary play. Everyone opens the same HTTPS game address.
The host chooses Continental, four human banks and the Balanced economy. Use
distinct fictional bank names and download each player's private reconnect key.
Share the invitation, not those keys. The host is trusted with full campaign
backups; see [hosting and recovery](online-multiplayer.md).

## Run the session

1. Join all four banks, then confirm readiness and start. Verify the map contains
   24 markets, every player has a different starting office, and the roster agrees
   on all four banks. Each player should see their own financial books and plan.
2. In month one, have three players complete their required decisions and click
   Ready. The fourth waits. The month must remain open. One ready player recalls
   their plan, changes a choice and submits again. The fourth then submits; all
   browsers must advance exactly once to month two.
3. During months two and three, try market selection, a customer opportunity,
   research and one affordable construction project. Check that changing tabs
   or receiving another player's readiness update retains your unsubmitted edits.
   Inspect the financial report after settlement; principal balances should stay
   separate from monthly income and costs.
4. Before the last submission of a later month, close one player's tab. The
   remaining players must keep seeing that reserved bank and an unfinished month.
   Reopen the game and reconnect, first using the remembered seat. Also test the
   downloaded key in a fresh browser profile. Verify the same bank and month are
   restored, with an already sealed plan still sealed.
5. Between submissions, have the service operator restart the server. Allow the
   browsers to reconnect. Verify every player returns to the same month and
   readiness state. Complete the outstanding plans and check that only one
   settlement occurs. Do this on a disposable test room, with a private backup.
6. Continue through at least ten completed months. On the phone, inspect markets,
   set a plan, scroll financial history sideways and submit. Record unreadable
   labels, hidden controls, unexpected scrolling or actions that appear ignored.
7. Export a private host backup and resume it as a new room. Players reclaim the
   saved human banks using the new room's credentials. Verify the saved books,
   map and month before continuing. Keep the original room until recovery is
   verified; ordinary Return to setup does not delete it.

## Record the result

Record the deployed commit, browser/device types, number of separate connections,
completed months, and whether each step passed. For a failure, record the last
working month, the affected bank, the visible error, and the clicks needed to
repeat it. Keep saves and reconnect keys private; screenshots intended for sharing
must omit private keys and any bank information the player wants to retain.

Ask each player which decisions were clear, which screens slowed them down, and
whether any starting bank seemed advantaged. This first session checks access,
turn flow, recovery and usability. It does not replace longer human balance
sessions or automated acquisition, receivership and terminal-game tests.
