BRANCH WARS: EXECUTIVE COMMAND v7.1
LONG-FORM / LOCAL-INTRANET EDITION
=================================

QUICK START
-----------
1. Extract the ZIP.
2. For Solo AI, Pass & Play, or Direct P2P, double-click OPEN_BRANCH_WARS.bat.
3. For an intranet room, the host double-clicks OPEN_LAN_GAME.bat.
4. Friends on the same local network open the yellow address shown in the host's
   server window. Both players select INTRANET ROOM and use the room code.

HOW A PLANNING CYCLE WORKS
--------------------------
The market is paused while both institutions prepare. You may:

- Reassign staff among Retail & Service, Business Banking, Lending, and
  Operations & Risk
- Change persistent deposit pricing, lending standards, and capital strategy
- Select one focus market
- Prioritize one optional live opportunity
- Begin one optional multi-cycle roadmap investment or operating initiative
- Request emergency board capital when the institution is in genuine distress
- Answer the current executive call

Click MARK READY when finished. Once both institutions are ready, the game
simulates the month: customer activity, deposit and loan production, credit
losses, earnings, opportunity contests, project progress, branch influence,
career milestones, and market-share movement all resolve simultaneously.

Nothing requires frantic clicking. Policies and staffing remain in place until
you change them. Projects continue automatically until completed.

HOW A CAMPAIGN IS WON
--------------------
There are two ways a campaign ends.

RECEIVERSHIP. Every institution carries regulatory capital, and its capital ratio
is capital measured against its loan book and deposit base. Both institutions can
always see each other's ratio and regulatory standing. As the ratio falls the
regulator escalates:

  8% and above   WELL CAPITALIZED             no restrictions
  6% to 8%       ENHANCED SUPERVISION         branch and acquisition projects suspended
  4% to 6%       CONSENT ORDER                deposit growth capped, loan book must shrink
  2% to 4%       UNDERCAPITALIZED             all new projects barred, franchise weakened
  below 2%       CRITICALLY UNDERCAPITALIZED  three straight cycles here forces receivership

Receivership ends the campaign immediately and the surviving institution assumes
the failed bank's deposits and branch network. This is not a sudden death: the
slide from healthy to failed takes well over ten cycles and every step is visible
to both players, so there is always time to raise capital, shrink the balance
sheet, or tighten lending. Two well-run institutions will never fail.

Capital is built primarily through retained earnings. Emergency Board Capital is
available only at critical capital levels, or during severe liquidity stress while
already under supervision. It needs banked executive influence, imposes three
cycles of expansion restrictions, attracts Corporate Attention, permanently costs
enterprise value, and can be used no more than twice in one campaign. Capital is
destroyed by losses, credit charge-offs, selling loans to fund deposit outflow,
and losing depositors to your rival.

DEPOSITS ARE CONTESTED. Deposit growth is no longer parallel. Each cycle the two
institutions compete directly for deposits in every open market, and the weaker
side loses balances to the stronger one. Losing deposits forces you to fund the
outflow from cash, and if cash runs short you must sell loans at a loss, which
comes straight out of capital. Aggressive pricing can win balances quickly, but
it creates a visible pool of rate-sensitive funding with a higher recurring cost.
Moving those customers back toward margin pricing causes runoff, so deposit growth
must now be timed against earnings, liquidity, and capital. That is the pressure
that can drive a rival under.

THE PLANNING HORIZON. If neither institution fails, the campaign runs its full
cycle count and is decided on enterprise value as before.

ENTERPRISE STRATEGY TREE
------------------------
Long-term development is divided into five four-tier lanes: Branch Network,
Digital Platform, Commercial Bank, Operational Excellence, and Acquisition
Strategy. Each node is a multi-cycle investment with its own cost and operating
effects.

Tier one can be sampled in any number of lanes without committing the institution.
The first lane completed to tier two becomes the permanent primary strategy.
Secondary lanes then cost more and cannot advance beyond tier two. Only the primary
lane can reach its campaign-defining tier-four capstone. A national campaign is
long enough to master one strategy and selectively support it with other capabilities,
but not to complete every lane.

Operational Excellence can still unlock a second project team, reduce initiative
times, and lower costs. Those benefits apply to operating initiatives; they do not
accelerate the strategy tree itself. It is therefore a distinct operating model,
not a compulsory opening upgrade for every bank.

CAMPAIGN MAPS
-------------
TOWN      4 markets // 12 planning cycles
REGION    6 markets // 16 planning cycles
STATE     8 markets // 20 planning cycles
NATIONAL 12 markets // 36 planning cycles

Larger maps unlock County Seat and University District on cycle 5, Metro Core
on cycle 10, State Capital on cycle 14, Agricultural Heartland on cycle 18,
Innovation Hub on cycle 22, Logistics Gateway on cycle 26, and Coastal Resort
District on cycle 30. Reach 55% share to control a market.

The main game view presents these markets as a modern isometric city. District
platforms, roads, parks, skyline height, branch markers, and blue/red influence
change with the campaign. Select a district directly on the city to set focus.
An Executive Overview above the city charts enterprise value over time and
compares deposits, loans, liquidity, operating risk, and profit.

PLAY MODES
----------
SOLO VS CORPORATE AI
Runs entirely inside the browser. The market stays paused until you are ready.
No network, server, Python, PowerShell, installation, or firewall permission.

PASS & PLAY
Two people use one computer. Each prepares a sealed plan behind a privacy
handoff screen; both plans then resolve simultaneously.

INTRANET ROOM (RECOMMENDED FOR TWO COMPUTERS)
The host runs OPEN_LAN_GAME.bat. The bundled PowerShell server displays a local
address and serves a private two-player room. Both browsers plan concurrently;
the host is authoritative and plans stay sealed until both players are ready.
No internet account, cloud service, Python, Node.js, or installation is needed.

Keep the server window and host browser open for the entire campaign. Windows
Firewall may ask whether to allow PowerShell the first time. Only allow network
profiles where you intend to play. If a workplace blocks local listening ports,
use Direct P2P or Pass & Play instead.

Room traffic uses ordinary HTTP inside the local network and is not encrypted.
Use a trusted LAN and never enter real customer, account, credential, or company
information into institution names or any future custom text fields.

The LAN host receives an automatic local recovery save after every synchronized
state. If a room cannot be restored after a browser or network interruption, the
host can continue that recovery save in Pass & Play mode or export it manually.

DIRECT P2P FALLBACK
Both players plan concurrently in separate browsers. WebRTC exchanges plans
directly using manually copied invitation and response codes. There is no
hosted service, web server, listening TCP port, IP address, or room database.

The connection desk reports two separate things, because a network link can come
up while the channel the game actually runs on does not:

  PEER      the network link between the two browsers
  CHANNEL   the data channel that carries plans and results

The campaign only starts once CHANNEL reads OPEN and both browsers have exchanged
an opening handshake. If the desk reads DIRECT LINK STALLED, the codes were
exchanged but one of those two steps never completed: press CANCEL on both
computers and exchange a fresh invitation and response. Codes are single use, so
a code from an earlier attempt will not connect. If it stalls again, the network
is blocking direct browser traffic; use INTRANET ROOM, Pass & Play, or Solo AI.

During a campaign the same readout stays in the header. If a plan is not
acknowledged by the host, the guest is released to plan again rather than being
left waiting on a rival who never received it.

Codes may be pasted exactly as they arrive. Line breaks added by Teams, Outlook
or any chat window are removed automatically, along with quote markers from
forwarded mail. If a code is refused, the message says why: the wrong kind of
code, only part of one, a code damaged in transit, or a code that answers an
invitation you have since replaced.

A dropped link no longer ends the campaign. The header carries NEW LINK CODE:
the host generates a replacement invitation, the rival pastes it and returns a
response, and play resumes on the cycle where it stopped. A brief interruption
is given time to recover on its own before the game reports it as lost.

If DIRECT LINK STALLED says the data channel never opened, the network is
blocking direct browser traffic between the two computers. No amount of waiting
will change that. Use INTRANET ROOM instead.

CONNECTING ACROSS TWO DIFFERENT NETWORKS
-----------------------------------------
Browsers hide your computer's network address from web pages, replacing it with
a name that can only be looked up on your own network segment. Two computers on
the same segment resolve it and connect. Two on different segments cannot, and
the connection desk sits at PEER NEW forever.

OPEN_BRANCH_WARS.bat now works out this computer's address and passes it to the
game, which fills in THIS COMPUTER'S NETWORK ADDRESS on the Direct P2P screen.
Both players should open the game that way. The address is added to the
invitation alongside the hidden name, so nothing is lost if you are on the same
segment after all, and the game remembers it if you later open the page directly.

You are only telling your own opponent your own computer's address. If the field
is empty, run ipconfig and copy the IPv4 address of your active adapter.

If the link still will not form with both addresses filled in, the two networks
do not permit direct traffic between workstations, and no setting in the game
changes that.

WHEN THE INTRANET ROOM ADDRESS DOES NOT WORK
--------------------------------------------
The server window prints the address it believes friends should use, plus any
other addresses on the machine. Test it from the OTHER computer first by opening
the /api/health address shown in the window: it should return {"ok":true}.

If that times out, it is one of two things and the window tells you which:

  Wrong address    A laptop with a VPN, Hyper-V, WSL, Docker or VirtualBox has
                   several addresses and only one is reachable from another
                   desk. Try the other addresses listed in the window.

  Firewall         Windows blocks inbound connections by default. If no firewall
                   prompt appeared when the server started, run the
                   New-NetFirewallRule command shown in the window once, from an
                   administrator PowerShell.

Branch-to-branch play across sites is a different problem again: the two
computers are usually on separate networks with no direct route between them.
Neither mode can create one. Pass & Play and Solo AI need no network at all.

REPOSITORY LINK (PLAY BETWEEN OFFICES)
---------------------------------------
The two computers never connect to each other. Each one reads and writes a
private GitHub repository over ordinary outbound HTTPS, so no inbound port, no
firewall rule and no route between the two sites is required. This is the mode
that works between branches.

Both players need their OWN access token. GitHub has no unauthenticated write,
so there is no way for one player to carry the other. Never send anyone your
token, and never accept theirs.

Setting it up once:
  1. Create a free GitHub organisation and a private repository inside it.
     An organisation matters: a token can only reach repositories owned by its
     own account, so a repository on a personal account would force the other
     player to use a token with access to everything they own.
  2. Add the other player to the organisation, and allow fine-grained tokens in
     the organisation settings.
  3. Each player creates a fine-grained token scoped to that one repository,
     with Contents set to read and write. Nothing else is needed.
  4. The host enters the repository and their token, opens a room, and sends the
     join code. The join code contains the repository and room only, never a
     token.
  5. The rival pastes the join code and enters their own token.

The game writes only two files per room, one per player, so the two of you never
write the same file and no edit can be lost. Turns appear within a few seconds.
FORGET SAVED TOKEN clears the token from this browser.

For GitHub Enterprise, put your internal API address in the API ADDRESS field.

IMPORTANT NETWORK LIMITATION
----------------------------
The game does not bypass company network or browser security policy. Intranet
rooms require both computers to be on a network that allows direct local traffic.
AI and Pass & Play remain fully local and require no network at all.

NEW IN v7.1
-----------
- Five-lane Enterprise Strategy Tree with four named tiers per lane
- Permanent primary-strategy commitment at tier two
- More expensive secondary strategies with a tier-two ceiling
- Mutually exclusive tier-four capstone paths
- Branch, digital, commercial, operational, and acquisition strategy effects
- Emergency Board Capital separated from the project system
- Board concessions, expansion restrictions, influence costs, and a two-rescue cap
- Strategy-aware AI identities and v6.0/v7.0 save migration

FOUNDATION FROM v7.0
-----------
- Win by driving the other institution into receivership, not only on points
- Regulatory capital ratios, five supervision tiers, and visible rival standing
- Contested deposits: the stronger franchise pulls balances off the weaker one
- Credit losses that genuinely respond to lending standards and risk controls
- Project capacity tied to the staffing plan being submitted
- Reliable room-code play over a local intranet
- 36-cycle National Legacy campaign with twelve staged markets
- Five permanent executive doctrines with distinct compounding advantages
- Rotating macroeconomic regimes: expansion, steady growth, tight money,
  downturn, and recovery
- Capital strategy, liquidity warnings, credit losses, funding costs, and deposit runoff
- Multi-cycle operating initiatives alongside the new strategy tree
- Twenty-six executive events with operational consequences
- Six career milestones with one-time capital awards and final value bonuses
- Deeper AI responses to liquidity, credit risk, economic regime, and projects
- Modern isometric city map with live district control and branch visualization
- Persistent enterprise-value graph and visible balance-sheet comparison
- Backward import support for v6.0 and v7.0 local save files
- Solo AI, Pass & Play, Direct P2P, export/import, and sealed WEGO play retained

FILES
-----
BRANCH_WARS.html       Complete game; all rules and assets are inside this file
OPEN_BRANCH_WARS.bat   Convenience launcher for offline/local modes
OPEN_LAN_GAME.bat      Starts the room server and opens the host browser
BRANCH_WARS_LAN_SERVER.ps1  Dependency-free local room relay
RUN_TESTS.bat          Optional developer simulation checks (requires Node.js)
README.txt             Instructions and limitations

PRIVACY / WORKPLACE USE
-----------------------
The game is fictional. Do not enter customer information, account numbers,
credentials, confidential company information, or other protected data.
Use workplace network features only when permitted by company policy.
