# Persistent HTTPS hosting

The root [Dockerfile](../Dockerfile) packages the dependency-free Core multiplayer server, current portable release, and canonical source modules. It checks release freshness during the build and runs as the `node` user (UID 1000). The build context excludes Git history, diagnostics, saved campaigns, and private room storage. No npm install or application secrets are required.

From the repository root, run the container acceptance check:

```sh
node deployment/container-smoke.js
```

This builds the image, starts it with a temporary private volume on a loopback-only port, checks the playable page and private campaign requests, kills and recreates the container, reconnects with the original seat token, verifies stored file permissions, and removes its own container and volume. It prints no reconnect keys.

For an existing Docker host:

```sh
docker build -t branchwars:release .
docker volume create branchwars-rooms
docker run -d --name branchwars --restart unless-stopped \
  --mount type=volume,source=branchwars-rooms,target=/var/data \
  -p 127.0.0.1:10000:10000 branchwars:release
```

Put that loopback service behind the host's HTTPS reverse proxy. Players open its public HTTPS origin; the playable HTML and multiplayer API share that origin. Keep one server instance per data volume. For a bind mount, provision its directory for UID/GID 1000 before starting; a named Docker volume inherits the image's directory ownership.

## Render Blueprint

The root [render.yaml](../render.yaml) defines a single paid Docker web service, a 1 GB persistent disk mounted at `/var/data`, and the `/api/multiplayer/health` readiness endpoint. Render supplies the public HTTPS URL and `PORT`; the image binds to `0.0.0.0`. Service automatic deployments are disabled so each accepted release can be deployed deliberately. Separately disable **Auto Sync** in the Blueprint's settings: service `autoDeployTrigger: off` does not prevent a changed Blueprint from automatically applying infrastructure changes.

1. Make the accepted release, including these deployment files, available on the chosen Git branch.
2. Sign into the intended Render account, connect the Git repository, and create a Blueprint from that branch and `render.yaml`.
3. Review the service name, region, account billing, compute plan, and disk before creating the resources. Choose the region during creation; Render does not permit changing it afterward.
4. Disable Blueprint **Auto Sync**, deploy, then verify the public page and `/api/multiplayer/health`. Create a private test campaign, save its reconnect key, restart the service, and reconnect to the same month before inviting players.

The current minimum paid compute plan is `0.5c-512mb`: $7/month for 0.5 CPU and 512 MB RAM. A 1 GB disk adds $0.25/month, making the baseline $7.25/month on the $0/month Hobby workspace. Hobby includes 5 GB/month outbound bandwidth, then $0.15/GB. Other workspace plans, larger disks, and usage can add charges. These figures were checked against Render's official pricing on 2026-10-03; review the dashboard's price before creating resources.

Only files under the mounted disk survive Render restart and redeploy. The room files contain private campaign books and hashed seat credentials. Treat disk snapshots and downloaded backups as private. Each player must keep their reconnect key; an ordinary room invite does not recover a reserved seat. Host campaign exports include every bank's private campaign information and omit room tokens. A disconnected human keeps its reserved seat and holds the month open. Hosts can explicitly close abandoned rooms after exporting a backup if needed.

Before sending Create or Join, the browser generates and privately stores its seat key and pending request. If the first response is lost, use **Retry connection**, including after reloading the page, to recover the same room and bank. The retry also survives a server restart when the persistent disk is enabled. Changing an unconfirmed setup requires retrying it or explicitly discarding the pending request. Pending requests use browser session storage; **Remember this private bank on this device** also permits local storage recovery after closing the tab. Imported-campaign requests retain the private backup in that browser storage until confirmed. The server stores only credential hashes and fixed-size request fingerprints, and invitations never contain the private key.

A persistent disk supports one instance and prevents zero-downtime deploys: Render stops the old instance before starting its replacement. Schedule release restarts between turns. Render makes encrypted daily disk snapshots, retained for at least seven days; restoring one rolls all rooms back to the snapshot. The first live restart check also verifies that the platform-mounted directory is writable by UID 1000; container acceptance checks alone cannot establish Render account permissions or disk provisioning.

Official references: [pricing](https://render.com/pricing), [Blueprint specification](https://render.com/docs/blueprint-spec), [persistent disks](https://render.com/docs/disks), [Docker](https://render.com/docs/docker), and [web services / HTTPS](https://render.com/docs/web-services). Player and operator behavior is described in [the multiplayer guide](../game/docs/online-multiplayer.md).
