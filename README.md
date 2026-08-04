# LifeBox Telegram Bot

## Run with Podman Compose

1. Copy `.env.example` to `.env` and fill in the real values.
2. Start the bot, its SQLite volume, and the temporary MongoDB migration source:

```bash
podman compose up --build -d
```

3. Watch the first startup migration and application logs:

```bash
podman compose logs -f lifebox_bot
```

4. Stop the services:

```bash
podman compose down
```

The API is exposed on `http://localhost:8081`. The loopback-only port mapping in
`compose.yaml` prevents access from other hosts.

## Temporary MongoDB to SQLite startup migration

The bot now uses SQLite for all runtime persistence. On startup it creates the
SQLite schema at `SQLITE_PATH` (default: `telegram-bot.sqlite`) and checks for the
`mongodb-to-sqlite-v1` completion marker. If the marker is absent, it reads the
`users`, `groups`, and `polls` MongoDB collections and replaces the corresponding
SQLite rows in one transaction. MongoDB is only queried with `find`; no MongoDB
write operation is present in the application.

After a successful import, later startups skip MongoDB based on the marker. Keep
the MongoDB service and `DB_CONNECTION_STRING` available until the temporary
startup importer is removed in the post-migration cleanup.

Compose persists SQLite in the `lifebox-sqlite-data` volume at
`/data/lifebox.sqlite`. Do not run `podman compose down -v` unless both database
volumes should be deleted.
