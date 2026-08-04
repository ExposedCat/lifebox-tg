#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT_DIRECTORY = Path(__file__).resolve().parent.parent
TABLES = {
    "users": "user_id",
    "user_groups": "user_id, group_index",
    "day_rates": "user_id, rate_index",
    "groups": "group_id",
    "group_tag_users": "group_id, user_index",
    "polls": "poll_id",
}

MongoDocument = dict[str, Any]
MongoData = dict[str, list[MongoDocument]]


def load_env(path: Path = ROOT_DIRECTORY / ".env") -> None:
    """Load the simple KEY=VALUE entries used by this project's .env file."""
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line.removeprefix("export ").strip()

        key, separator, value = line.partition("=")
        if not separator:
            continue

        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
            value = value[1:-1]
        os.environ.setdefault(key, value)


def read_mongo_data(connection_string: str) -> MongoData:
    try:
        from pymongo import MongoClient
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "pymongo is not installed; run "
            "`python3 -m pip install -r requirements-migration.txt`"
        ) from error

    client = MongoClient(connection_string, tz_aware=True)
    try:
        mongo = client.get_default_database(default="lifebox")
        return {
            "users": list(mongo["users"].find({})),
            "groups": list(mongo["groups"].find({})),
            "polls": list(mongo["polls"].find({})),
        }
    finally:
        client.close()


def timestamp(value: datetime | None) -> int | None:
    if value is None:
        return None
    if not isinstance(value, datetime):
        raise ValueError(f"Cannot migrate invalid date: {value!r}")
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return int(value.timestamp() * 1000)


def create_schema(database: sqlite3.Connection) -> None:
    database.execute("PRAGMA foreign_keys = ON")
    database.execute("PRAGMA journal_mode = WAL")
    database.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            name TEXT,
            mongo_id TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_groups (
            user_id INTEGER NOT NULL,
            group_index INTEGER NOT NULL,
            group_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, group_index),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS user_groups_group_id_idx
            ON user_groups(group_id);

        CREATE TABLE IF NOT EXISTS day_rates (
            user_id INTEGER NOT NULL,
            rate_index INTEGER NOT NULL,
            poll_id TEXT NOT NULL,
            date INTEGER,
            value INTEGER,
            PRIMARY KEY (user_id, rate_index),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS day_rates_poll_id_idx
            ON day_rates(poll_id);

        CREATE INDEX IF NOT EXISTS day_rates_date_idx
            ON day_rates(date);

        CREATE TABLE IF NOT EXISTS groups (
            group_id INTEGER PRIMARY KEY,
            is_channel INTEGER NOT NULL CHECK (is_channel IN (0, 1)),
            receive_custom_polls INTEGER NOT NULL
                CHECK (receive_custom_polls IN (0, 1)),
            receive_daily_polls INTEGER NOT NULL
                CHECK (receive_daily_polls IN (0, 1)),
            mongo_id TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_tag_users (
            group_id INTEGER NOT NULL,
            user_index INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            PRIMARY KEY (group_id, user_index),
            FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS group_tag_users_user_id_idx
            ON group_tag_users(user_id);

        CREATE TABLE IF NOT EXISTS polls (
            poll_id TEXT PRIMARY KEY,
            message_id INTEGER,
            date INTEGER NOT NULL,
            mongo_id TEXT NOT NULL
        );
        """
    )


def write_sqlite_data(database: sqlite3.Connection, data: MongoData) -> None:
    with database:
        for table_name in (
            "group_tag_users",
            "user_groups",
            "day_rates",
            "polls",
            "groups",
            "users",
        ):
            database.execute(f'DELETE FROM "{table_name}"')

        for user in data["users"]:
            user_id = user["userId"]
            database.execute(
                "INSERT INTO users (user_id, name, mongo_id) VALUES (?, ?, ?)",
                (user_id, user.get("name"), str(user["_id"])),
            )
            for group_index, group_id in enumerate(user.get("groups") or []):
                database.execute(
                    """
                    INSERT INTO user_groups (user_id, group_index, group_id)
                    VALUES (?, ?, ?)
                    """,
                    (user_id, group_index, group_id),
                )
            for rate_index, rate in enumerate(user.get("dayRates") or []):
                database.execute(
                    """
                    INSERT INTO day_rates
                        (user_id, rate_index, poll_id, date, value)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        rate_index,
                        str(rate["pollId"]),
                        timestamp(rate.get("date")),
                        rate.get("value"),
                    ),
                )

        for group in data["groups"]:
            group_id = group["groupId"]
            settings = group.get("settings") or {}
            database.execute(
                """
                INSERT INTO groups (
                    group_id,
                    is_channel,
                    receive_custom_polls,
                    receive_daily_polls,
                    mongo_id
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    group_id,
                    int(group.get("isChannel", False)),
                    int(settings.get("receiveCustomPolls", False)),
                    int(settings.get("receiveDailyPolls", True)),
                    str(group["_id"]),
                ),
            )
            for user_index, tagged_user in enumerate(settings.get("tagUsers") or []):
                database.execute(
                    """
                    INSERT INTO group_tag_users (group_id, user_index, user_id)
                    VALUES (?, ?, ?)
                    """,
                    (group_id, user_index, tagged_user["userId"]),
                )

        for poll in data["polls"]:
            database.execute(
                """
                INSERT INTO polls (poll_id, message_id, date, mongo_id)
                VALUES (?, ?, ?, ?)
                """,
                (
                    poll["pollId"],
                    poll.get("messageId"),
                    timestamp(poll["date"]),
                    str(poll["_id"]),
                ),
            )


def log_sqlite_data(database: sqlite3.Connection) -> None:
    database.row_factory = sqlite3.Row
    for table_name, order_by in TABLES.items():
        rows = database.execute(
            f'SELECT * FROM "{table_name}" ORDER BY {order_by}'
        ).fetchall()
        print(f"{table_name}:")
        print(json.dumps([dict(row) for row in rows], ensure_ascii=False, indent=2))


def main() -> int:
    load_env()
    connection_string = os.environ.get("DB_CONNECTION_STRING")
    if not connection_string:
        raise RuntimeError("DB_CONNECTION_STRING is not set")
    sqlite_path = Path(os.environ.get("SQLITE_PATH", "telegram-bot.sqlite"))

    print("Reading MongoDB data…")
    data = read_mongo_data(connection_string)
    print(
        f'Read {len(data["users"])} users, '
        f'{len(data["groups"])} groups, and '
        f'{len(data["polls"])} polls from MongoDB'
    )

    print(f"Writing SQLite data to {sqlite_path}…")
    database = sqlite3.connect(sqlite_path)
    try:
        create_schema(database)
        write_sqlite_data(database, data)

        print("Reading and logging migrated SQLite data…")
        log_sqlite_data(database)
    finally:
        database.close()

    print("Done")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Migration failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
