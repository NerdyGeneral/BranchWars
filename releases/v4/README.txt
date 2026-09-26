BRANCH WARS - LOCAL RELEASE CANDIDATE

Keep these files together. No installation or account is needed for local play.
Open OPEN_BRANCH_WARS.bat on Windows, or open BRANCH_WARS.html in your browser.
Choose Solo vs Corporate AI or Pass & Play for local hotseat play.

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
