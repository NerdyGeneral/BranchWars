# Node 24 LTS official multi-platform image, pinned for reproducible releases.
FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=10000

# The server assembles the exact release from these dependency-free sources.
COPY game/src/ game/src/
COPY game/tools/build_game.js game/tools/multiplayer_server.js game/tools/
COPY game/BRANCH_WARS.html game/BRANCH_WARS.html
RUN node game/tools/build_game.js --check \
    && chmod -R a+rX /app/game \
    && mkdir -p /var/data/branchwars \
    && chown -R node:node /var/data \
    && chmod 700 /var/data /var/data/branchwars

USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/multiplayer/health',{signal:AbortSignal.timeout(4000)}).then(async r=>{if(!r.ok||(await r.json()).ok!==true)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "game/tools/multiplayer_server.js", "--data-dir", "/var/data/branchwars"]
