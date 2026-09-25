BRANCH WARS - V4 rc4 CORE PLAYTEST

Keep these files together. No installation or account is needed for local play.
Open OPEN_BRANCH_WARS.bat on Windows, or open BRANCH_WARS.html in your browser.
Choose Solo vs Corporate AI or Pass & Play for local hotseat play.

WHAT IS NEW IN rc4 (CORE EDITION ONLY)

Core is the edition to play for this test. Choosing "Core edition" in setup now
creates campaign save version 8.20 with a rebuilt research layer:

  - Six capability branches, not five. RISK & CAPITAL is new and owns credit
    losses, provisioning and capital standing.
  - Three permanent operating models per branch instead of two. Each is a trade,
    not an upgrade: every model costs you something as well as paying.
  - Five combined capabilities that need two branches at once, listed under
    COMBINED CAPABILITIES in Research. They apply automatically.
  - Stronger products are earned by research. The first option on every product
    line is always available, so no bank is ever left unable to trade.
  - Lending deploys the balance sheet. Your lending desk no longer caps the loan
    book on headcount alone; each cycle the bank puts part of the gap between
    deposits and loans to work, at a pace your Lending bankers set. With nobody
    assigned to Lending, nothing is deployed.
  - Commercial relationships are limited by your physical presence. Past what
    your branch network can carry, new relationships arrive far more slowly
    however many Business bankers you assign.

Open Help and search "loan deposit ratio", "relationships branches capacity" or
"combined capability" for in-game explanations of the three new rules.

WHAT TO REPORT

Balanced against simulated opponents only. No human has played it. Useful notes:

  - Does deploying deposits into loans feel like a decision, or bookkeeping?
  - Do locked products read as something to earn, or something taken away?
  - Does your bank feel different from your opponent's by mid-game?
  - Known: most of your staff on Lending with almost none on Service scores
    badly. A moderate lending tilt is healthy; an extreme one starves the
    deposits that fund it.

EXPANDED EDITION

Expanded is unchanged from rc3 (save 9.33). Un-opted Core stays at 8.19 and
replays exactly as before. Every earlier save format still loads.

MULTIPLAYER
LAN/Intranet: the host runs OPEN_LAN_GAME.bat and keeps the server window open.
Use the address shown by that server on both computers. The host creates an
Intranet Room; the friend joins with its room code. Follow the shared lobby.
Only allow network access on a trusted local network; do not expose this server
to the public Internet. Do not disable firewall/security protections.

Repository Link: both players use their own access tokens for the intended
shared GitHub repository. Prefer a private repository. Exchange the room join
code, not credentials. Keep the host browser open. Use Resume/Retry for recovery
and retain your own campaign exports. Room play writes fictional game messages
to the chosen repository; this package itself performs no publication.

Direct P2P: exchange the complete host invitation and rival response codes.
Both browsers must remain open. Network restrictions can prevent a direct link;
LAN/Intranet or Repository Link are alternatives. No public relay is bundled.

SAVES AND UPDATES
Before updating or moving this folder, the host should EXPORT the campaign and
keep the old package. Browser autosaves depend on browser/origin and are not a
substitute for an exported backup. IMPORT the export when moving to a new origin.
Only the host exports the authoritative multiplayer campaign. Never distribute
private saves or access tokens with the game. Keep a backup before importing.

OPTIONAL COMPLEXITY
Existing optional systems and current opt-in defaults are preserved. Review
dependency confirmations before starting. In multiplayer, the host applies the
shared settings and both players confirm readiness. Campaign rules stay fixed
after play begins. National Empire remains a future expansion.

RELEASE STATUS
This is an engineering release candidate for review, not a claim that human
balance or enjoyment is settled. A real two-computer multiplayer acceptance
session remains unverified. Automated and simulated tests do not replace it.

INTEGRITY
manifest.json lists SHA-256 hashes and byte sizes of the five content files.
The six-file package contains no development sources, reports, private saves,
credentials, or dependencies. Hashes detect accidental changes, not authenticity
of an untrusted distribution. No GitHub commit, push, or release is performed by
the packaging tool.
