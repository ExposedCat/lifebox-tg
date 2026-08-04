# LifeBox Telegram Bot

## Run with Podman Compose

1. Copy `.env.example` to `.env` and fill in real values (especially `TOKEN`).
2. Start the bot and MongoDB:

```bash
podman compose up --build -d
```

3. Check logs:

```bash
podman compose logs -f lifebox_bot
```

4. Stop services:

```bash
podman compose down
```

The API is exposed on `http://localhost:8081`.
This is mapped as `127.0.0.1:8081:8081` in `compose.yaml`, which keeps it reachable only from your local machine.
If you do not need host access to the API endpoint, you can remove the `ports` section from `lifebox_bot`.

`compose.yaml` overrides `DB_CONNECTION_STRING` for the bot service to use the internal MongoDB host (`lifebox_db`), so your regular local `.env` value can stay unchanged.

## Migrate MongoDB to SQLite

Set `DB_CONNECTION_STRING` and, optionally, `SQLITE_PATH` in `.env`, then run:

```bash
npm run migrate:mongo-to-sqlite
```

The migration only reads MongoDB. It replaces the LifeBox rows in SQLite in a
single transaction, then reads every migrated SQLite table and logs its contents.
`SQLITE_PATH` defaults to `telegram-bot.sqlite`.
