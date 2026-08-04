import BetterSqlite3 from 'better-sqlite3'
import { Kysely, SqliteDialect, sql } from 'kysely'

import type { Database, DatabaseSchema } from '../types/index.js'

async function migrateSchema(database: Database) {
	await sql`PRAGMA foreign_keys = ON`.execute(database)
	await sql`PRAGMA journal_mode = WAL`.execute(database)
	await sql`PRAGMA busy_timeout = 5000`.execute(database)

	await database.schema
		.createTable('users')
		.ifNotExists()
		.addColumn('user_id', 'integer', column => column.primaryKey())
		.addColumn('name', 'text')
		.addColumn('mongo_id', 'text', column => column.notNull())
		.execute()

	await database.schema
		.createTable('user_groups')
		.ifNotExists()
		.addColumn('user_id', 'integer', column => column.notNull())
		.addColumn('group_index', 'integer', column => column.notNull())
		.addColumn('group_id', 'integer', column => column.notNull())
		.addPrimaryKeyConstraint('user_groups_pk', ['user_id', 'group_index'])
		.addForeignKeyConstraint(
			'user_groups_user_id_fk',
			['user_id'],
			'users',
			['user_id'],
			constraint => constraint.onDelete('cascade')
		)
		.execute()

	await database.schema
		.createIndex('user_groups_group_id_idx')
		.ifNotExists()
		.on('user_groups')
		.column('group_id')
		.execute()

	await database.schema
		.createTable('day_rates')
		.ifNotExists()
		.addColumn('user_id', 'integer', column => column.notNull())
		.addColumn('rate_index', 'integer', column => column.notNull())
		.addColumn('poll_id', 'text', column => column.notNull())
		.addColumn('date', 'integer')
		.addColumn('value', 'integer')
		.addPrimaryKeyConstraint('day_rates_pk', ['user_id', 'rate_index'])
		.addForeignKeyConstraint(
			'day_rates_user_id_fk',
			['user_id'],
			'users',
			['user_id'],
			constraint => constraint.onDelete('cascade')
		)
		.execute()

	await database.schema
		.createIndex('day_rates_date_idx')
		.ifNotExists()
		.on('day_rates')
		.column('date')
		.execute()

	await database.schema
		.createTable('groups')
		.ifNotExists()
		.addColumn('group_id', 'integer', column => column.primaryKey())
		.addColumn('is_channel', 'integer', column => column.notNull())
		.addColumn('receive_custom_polls', 'integer', column => column.notNull())
		.addColumn('receive_daily_polls', 'integer', column => column.notNull())
		.addColumn('mongo_id', 'text', column => column.notNull())
		.addCheckConstraint('groups_is_channel_boolean', sql`is_channel IN (0, 1)`)
		.addCheckConstraint(
			'groups_receive_custom_polls_boolean',
			sql`receive_custom_polls IN (0, 1)`
		)
		.addCheckConstraint(
			'groups_receive_daily_polls_boolean',
			sql`receive_daily_polls IN (0, 1)`
		)
		.execute()

	await database.schema
		.createTable('group_tag_users')
		.ifNotExists()
		.addColumn('group_id', 'integer', column => column.notNull())
		.addColumn('user_index', 'integer', column => column.notNull())
		.addColumn('user_id', 'integer', column => column.notNull())
		.addPrimaryKeyConstraint('group_tag_users_pk', ['group_id', 'user_index'])
		.addForeignKeyConstraint(
			'group_tag_users_group_id_fk',
			['group_id'],
			'groups',
			['group_id'],
			constraint => constraint.onDelete('cascade')
		)
		.execute()

	await database.schema
		.createIndex('group_tag_users_user_id_idx')
		.ifNotExists()
		.on('group_tag_users')
		.column('user_id')
		.execute()

	await database.schema
		.createTable('polls')
		.ifNotExists()
		.addColumn('poll_id', 'text', column => column.primaryKey())
		.addColumn('message_id', 'integer')
		.addColumn('date', 'integer', column => column.notNull())
		.addColumn('mongo_id', 'text', column => column.notNull())
		.execute()

	await database.schema
		.createIndex('polls_date_idx')
		.ifNotExists()
		.on('polls')
		.column('date')
		.execute()

	await database.schema
		.createTable('migration_state')
		.ifNotExists()
		.addColumn('name', 'text', column => column.primaryKey())
		.addColumn('completed_at', 'integer', column => column.notNull())
		.execute()
}

async function connectToDb(): Promise<Database> {
	const sqlite = new BetterSqlite3(
		process.env.SQLITE_PATH ?? 'telegram-bot.sqlite'
	)
	const database = new Kysely<DatabaseSchema>({
		dialect: new SqliteDialect({ database: sqlite })
	})
	await migrateSchema(database)
	return database
}

export { connectToDb, migrateSchema }
