# Online Core multiplayer

The dependency-free Node server hosts Core campaigns with 2–4 human or AI banks.
The national map has 12 markets; the continental map has 24. The server owns the
campaign and resolves a month once every active human has locked a valid plan.
Each browser receives its own bank's private view and public rival information.
Existing two-bank local, LAN, Repository Link and direct-P2P workflows are separate.

The [container and Render deployment package](../../deployment/README.md)
provides a reproducible hosting route. After deployment, use the
[four-player playtest](core-online-playtest.md) to check separate connections.

From the repository root, run:

```sh
HOST=127.0.0.1 node game/tools/multiplayer_server.js 8765 --data-dir /path/to/private/branchwars-rooms
```

Choose a durable directory writable by the server account, outside the repository.
The server creates it with mode 0700 and writes room files with mode 0600. Room
files contain private campaign books and hashed seat credentials. Writes replace
files atomically; game state and successful command receipts survive restart.
Start only one server process for each data directory. Without `--data-dir`, the
server is explicitly memory-only and every room is lost when it stops. A `/tmp`
directory may survive a process restart but is unsuitable for durable hosting.

Open `http://127.0.0.1:8765/` for local development. For players in separate
locations, give this server a public HTTPS address through your hosting service
or a TLS reverse proxy, and serve the game and `/api/multiplayer` at that same
address. For example, a reverse proxy can forward your HTTPS game hostname to
`127.0.0.1:8765`. The Node process supplies HTTP behind that proxy. Use the hosting
service's normal HTTPS and access configuration; this repository does not deploy
or create a public hostname. Set `HOST` to an appropriate interface if the proxy
runs in a separate container. The default listener is `0.0.0.0`.

The host creates a room and chooses its map, bank count and AI slots. Other
players join the room's human slots. Everyone confirms the current lobby before
the host starts. Setup or identity changes withdraw previous confirmations.
Claimed human seats cannot be silently removed or changed to AI. A disconnected
human keeps their reserved seat, and an unfinished month waits for their return.
If every human bank has been eliminated, the host can explicitly observe the
next AI month; eliminated banks' books remain frozen.

Keep each bank's reconnect key private. It contains that seat's bearer token and
must be used with the same server and room. A token authorizes only its own seat;
knowing a room code does not grant another bank's access. Reopening with the same
token resumes after a server restart when durable storage is enabled. The server
stores token hashes, so it cannot recover a lost token. A host backup can instead
create a new room with the saved banks and fresh seat tokens. Importing a backup
preserves the original bank names and AI slots; all humans confirm the resumed
campaign before the host starts it.

An explicit host export contains the full campaign, including every bank's
private books and locked instructions. Keep it private. Exports never contain
room access tokens. Ordinary polling and joins never send another seat's token
or private bank state.

Finished and abandoned rooms remain available for reconnection. To release a
room, the host can explicitly POST `{"confirm":true}` to
`/api/multiplayer/rooms/ROOMCODE/close` using their bearer token. This permanently
removes that room and its stored campaign; export first if a backup is needed.
Ordinary browser Leave/disconnect must not close the room. The default server
limits stored rooms to 128 and successful creation to 12 rooms per minute per
connection address. A shared reverse proxy may aggregate that address; reuse
existing rooms and close unneeded ones.

A private `.server.lock` prevents concurrent writers. Linux locks also record
boot and process identity so a reused PID does not block recovery. If a lock on
another platform is stale, confirm no process is using the directory before
removing that lock. Keep room files when restarting; never delete them to repair
an ordinary reconnect failure.

Validate changes with `node game/tests/multiplayer_server.test.js`. This runs
real loopback HTTP requests with the assembled engine, including four-seat
privacy, turn/replay checks, mixed AI play, resumed saves, restart continuity,
failed storage, simultaneous request bodies and spectator advancement. It does
not establish public-host availability or physical two-computer reliability.
