# UI rework and staffing usability

A proposed rebuild of the in-game navigation and the staffing interface. Written against
the shipped Group 8 client; every claim about current behaviour is measured, not assumed.

## Part 1 — Why the menu does not make sense

The 11 workspaces are grouped by **subject**:

| group | workspaces |
|---|---|
| Bank & finance | `overview`, `credit`, `group` |
| Customers & markets | `markets`, `customers`, `products` |
| Run the bank | `operations`, `workforce` |
| Growth & competition | `strategy`, `competition`, `intelligence` |

But the player does not act by subject. They act on a **monthly cadence**: some things
must be decided before the turn can end, some are multi-month commitments, and some are
only read. Grouping by subject scatters all three across every group.

That is the reason "why is Credit under Overview when I'm deciding operations" is a fair
complaint. `credit` holds the collections policy and loan-quality controls — a decision
you take this month — but it is filed next to `overview` (a read-only scoreboard) and
`group` (capital structure) because all three are "financial". "Bank & finance" is not a
group, it is a leftovers bin. Meanwhile `operations` and `workforce` are the only two
under "Run the bank", though `credit`, `products` and `customers` all carry monthly
operating decisions too.

Second problem: **nothing tells you what the turn requires.** A required-decision list
already exists and already deep-links to its controls, but it lives inside a panel on one
workspace rather than being the thing you land on.

## Part 2 — Proposed structure: three bands by cadence

Replace the four subject groups with three bands. Same 11 workspaces, regrouped; no
engine change.

### Band 1 — This month (the turn loop)

Everything that gates **Mark Ready**, in settlement order:

1. **Focus & markets** — focus market, opportunities pipeline (from `markets`)
2. **People** — allocation across the four roles, plus the function/office commitments
   (from `workforce`)
3. **Money & policy** — deposit, lending and capital policy, collections share,
   product pricing (the decision halves of `credit` and `products`)
4. **Executive decision** — the monthly event choice
5. **Review & ready** — the required-decision list, the change preview, Mark Ready

This band answers "what do I have to do to finish the month", and it is the landing
surface.

### Band 2 — Build & invest (multi-month commitments)

Projects, branch and facility construction, research and strategy lanes, product
development, hiring. These are decisions whose effects arrive in later months, so they
should not be interleaved with the turn loop. Draws on `operations` (projects),
`markets` (construction), `strategy`, `products` (development) and `workforce` (hiring).

Construction currently spans three workspaces; this band is where it collapses into one.

### Band 3 — Review (read-only)

`overview`, `intelligence`, `competition` scoreboard, `group` capital structure, and
credit-quality reporting. Nothing here changes a plan. Making it explicitly read-only is
what lets Band 1 stay short.

### Why this helps

- The Credit complaint dissolves: the collections *decision* is in Band 1, the loan-book
  *report* is in Band 3.
- The required list becomes the home screen rather than a panel.
- Band 3 can be as dense as it likes without costing turn-loop clarity.
- It is a navigation change: `WORKSPACE_GROUPS` plus the panels' host workspace. No
  engine edit, so the engine digest does not move.

## Part 3 — Staffing: keep the depth, fix the interface

### What the player is actually asked to do today

The same person is allocated up to **three times**:

1. **Assign to a role** — spread N bankers across service, business, lending, operations.
2. **Department functions claim a cut** — 11 functions take quotas from those same role
   pools, some retained automatically (`householdBook.policy.retention`,
   relationship-offer share, onboarding share, collections share), some ordered by hand.
3. **Offices claim a cut** — every open office wants staff per role and is filled
   greedily in office order.

Whatever survives all three does the actual selling and lending. That residual is the
number that decides deposits and loans, and it is computed **last** and shown as the tail
of a subtraction sentence.

### Why it feels broken — measured, not guessed

- The **service pool is 100% claimed in every cycle measured.** Three claims multiply on
  it: retention (default **75%**), then relationship offers, then onboarding. The residual
  floors to **0**.
- The **lending pool runs 62-100% claimed**; effective origination staff measured
  0.75 falling to 0.00 against 2 allocated.
- So the player diverts people, then diverts them again, and the thing they were diverting
  them *for* gets nothing. The interface is not lying; the arithmetic really does end at
  zero.

### Proposed changes

**1. One staffing screen with one sentence per role.** A single table, not an expression:

| role | people | committed | free for new business |
|---|---|---|---|
| Retail & service | 3 | 3.0 | **0.0** |
| Lending | 2 | 1.5 | **0.5** |

"Free for new business" becomes a named, first-class figure. Today the equivalent is the
tail of `assigned − teaching − retained − extra − rounding = remaining`.

**2. Delete "quarter-work units" from the interface.** Currently the UI says things like
*"quarter-work units required"* and explains *"One banker = four quarters"*. Show people
to one decimal everywhere; keep quarters internally as the exact unit. The player should
never have to convert.

**3. Stop asking for the per-office assignment.** A proposer already exists
(`lifecycleAllocateStaff`) and the AI already uses it. Make auto-staffing the default,
with a per-office manual override for players who want it. That removes the second
diversion entirely for anyone who does not care.

**4. Show each claim's cost where the claim is made.** Setting collections to 40% should
say, in that panel: *"leaves 1.2 of 3 lending people for new loans"*. Right now the
consequence is only visible on a different screen, after the fact.

**5. Warn when a pool reaches zero.** The measured failure mode is a silent zero. A pool
at zero free people is the single most important thing to surface, and it is currently
implicit.

**6. Keep every existing lever.** Retention, offer share, onboarding share, collections
share, function quotas, vendors, specialists and training all stay. This is a
presentation and default-behaviour change, not a simplification of the model.

## Part 4 — Sequencing

Ordered so each step is independently shippable and reversible:

1. **Regroup navigation** (Bands 1-3). Pure nav; no engine change.
2. **Make the required list the landing surface.**
3. **Staffing table and the "free for new business" figure**, with zero-pool warnings.
4. **Retire "quarter-work units" from display.**
5. **Auto-staff offices by default**, manual override retained.
6. **Collapse construction into Band 2.**

Steps 1-4 are presentation only. Step 5 changes a default, so it needs a before/after on
a 6-campaign sweep. Step 6 moves panels between workspaces.

## Open questions for the owner

- **Should the three service claims multiply, or divide a single budget?** Multiplying is
  why the residual floors to zero. Dividing one budget (retention + offers + onboarding +
  new business = 100%) would make the trade-off visible and bounded, but it changes the
  economy and needs measuring.
- **Is the default 75% retention intended?** It alone removes three quarters of the
  service pool before any other claim.
- **How much of Band 3 should exist at all?** Several read-only surfaces overlap; the
  feature register lists what play actually reaches.
