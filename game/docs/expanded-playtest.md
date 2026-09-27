# Expanded 9.37 playtest and polish — September 27

The focused playtest found and fixed three presentation defects. Campaign economics,
save versions and the engine are unchanged. The original 9.37 package is preserved.
All 312 standard fast-gate command entries passed against the final frozen build.
The local package and its independently extracted ZIP also passed verification.
The evidence ledger separates these checks from human acceptance.

## Fixes

1. Long cycle results now open at the heading and first announcement. Previously,
   focusing the bottom Continue button scrolled past the opening messages. Focus
   begins at the heading; Tab reaches Continue, and the next round resets scrolling.
2. Expanded keeps its selected inspector when the rival marks Ready. A legacy Core
   redraw was resetting the current route to its workspace default. Working decisions
   and the shared draft remain intact; old write callbacks still expire after updates.
3. Service statements distinguish **Current invoices paid**, **Earlier invoices
   collected**, **New unpaid invoices**, and **Invoices written off**. The former
   “Cash received” figure displayed only current-invoice payments. Every displayed
   amount comes from the settled engine report. Collecting a receivable is not new
   income, and no accounting entry is posted by opening the screen.

## Treasury comparison

Four legal 18-month campaigns used two scenarios with the routes swapped between
seats: 144 bank-months. Both banks followed the same constrained planning scaffold,
with route-specific research. Every complete plan was validated; each month included
half-ready save migration and ledger validation. Starting cash, customers, research
progress and platform completion were not injected. Early holding-company share
issues and parent support were actual funded orders.

These are exploratory examples, not an optimal strategy or a controlled estimate of
the route's isolated effect. Other bot-proposed policies and bank circumstances can
differ. Both seat assignments produced the service figures below.

| Scenario / route | Platform complete | First cash month | Fees billed | Cash collected, including older invoices | Recurring service costs | Research + setup |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Balanced / partner | 2 | 7 | $600,000 | $600,000 | $492,000 | $110,000 |
| Balanced / internal | 9 | 16 | $150,000 | $150,000 | $132,300 | $670,000 |
| Rate / partner | 2 | 4 | $750,000 | $750,000 | $519,000 | $110,000 |
| Rate / internal | 9 | 14 | $300,000 | $250,000 | $156,600 | $670,000 |

The internal route's rate-scenario customer paid one month late. At the end,
$50,000 remained receivable; $250,000 of earlier invoices had been collected.
Looking only at payments on the current month's invoices would incorrectly suggest
that this customer had never paid.

With one covered standard-price treasury client, the observed recurring service
cost was $33,000/month for the partner route and $20,100 for the fully researched
internal route, against $50,000 billed. The active empty platforms also cost money.
Internal delivery therefore had a better recurring margin but a substantially larger
upfront cost and a longer wait before serving clients in these runs.

These service costs exclude shared employee payroll and bank-wide overhead. The
research also improves other operations, so charging its entire cost to treasury
does not value those broader benefits. Neither route should be described as an
instant-profit upgrade. No prices or economic rules were retuned from this small
sample. Further human playtesting should examine whether the internal route's
long-term advantages justify its early burden.

## Browser and multiplayer checks

- **38 checks on a real loopback LAN server:** two independent Chromium contexts,
  real browser storage, private plans, announcements, funded borrowing and repayment,
  a queued guest submission during an interruption, and resume from an exported
  half-ready save after both pages reload. The rival Ready update preserves the
  selected inspector and unstaged decision. Results start at the top at desktop
  and 480px; keyboard continuation works.
- **22 native file-origin checks:** the unmodified portable opens directly from
  disk and imports earned month-19 campaigns. Service costs and invoice collections
  agree with reports; client filtering, research shortcuts, mature navigation and
  480px layouts work through actual controls.
- LAN instrumentation adds only a read-only JSON-copy accessor for observations.
  Actions use production controls and the real server. The file-origin walkthrough
  uses no state injection. No user browser session or save was used.

For LAN recovery, the original host exports via **Save & help → Export**. After a
reload, create a new Intranet Room, join from the second browser, and select
**Resume from save** in the host's lobby. Both players confirm readiness, then the
host starts the resumed campaign. A submitted plan survives that recovery. An
unsubmitted guest draft is not an authoritative saved plan. The local Continue
button resumes a LAN save as pass-and-play; it does not recreate the LAN room.

Physical two-computer multiplayer and human balance/enjoyment acceptance remain
unverified. Cards remains the next feature milestone; this pass did not implement it.

Copy follow-up: an inherited treasury-platform completion event still refers to
activation in Markets. In the rebuilt interface, use **Banking → Business services
→ Corporate treasury → Set up service**. The legacy engine event text was left
unchanged in this presentation-only pass.

## Evidence

See the local evidence ledger (local-only: `game/reports/local/expanded-playtest-20260927-111150/README.md`)
for final hashes, the standard regression gate, focused receipts and screenshots.
Diagnostic saves and reports stay outside the distribution package.
