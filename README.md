# LifeBox Telegram Bot

LifeBox runs on [Bun](https://bun.sh) (1.4+) and uses SQLite (`bun:sqlite`)
for all persistence.

## Development

```bash
bun install
bun run dev        # watch mode; Bun loads .env automatically
bun run test       # unit tests against in-memory SQLite
bun run typecheck
bun run check      # biome format + lint
```

Copy `.env.example` to `.env` and fill in the real values first. There is no
build step: Bun runs the TypeScript sources directly.

## Run with Podman Compose

1. Copy `.env.example` to `.env` and fill in the real values.
2. Start the bot:

```bash
podman compose up --build -d
```

3. Watch the application logs:

```bash
podman compose logs -f lifebox_bot
```

4. Stop the service:

```bash
podman compose down
```

The API is exposed on `http://localhost:8081`. The loopback-only port mapping in
`compose.yaml` prevents access from other hosts.

SQLite is stored at `SQLITE_PATH` (default: `telegram-bot.sqlite`). Compose
persists `/data/lifebox.sqlite` in the `lifebox-sqlite-data` volume. Do not run
`podman compose down -v` unless the SQLite database should also be deleted.
