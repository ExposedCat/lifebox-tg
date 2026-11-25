import type { Database as BunDatabase } from 'bun:sqlite'
import { Kysely, sql } from 'kysely'

import type { Database, DatabaseSchema } from '../types/index.ts'
import { createSqliteDialect, openSqlite } from './sqlite.ts'

function cleanupLegacySchema(sqlite: BunDatabase) {
	const legacyColumn = sqlite.prepare(
		"SELECT 1 FROM pragma_table_info(?) WHERE name = 'mongo_id'"
	)
	sqlite.transaction(() => {
		for (const table of ['users', 'groups', 'polls'] as const) {
			if (legacyColumn.get(table)) {
				sqlite.run(`ALTER TABLE "${table}" DROP COLUMN "mongo_id"`)
			}
		}
		sqlite.run('DROP TABLE IF EXISTS "migration_state"')
	})()
}

async function migrateSchema(database: Database) {
	await database.schema
		.createTable('users')
		.ifNotExists()
		.addColumn('user_id', 'integer', column => column.primaryKey())
		.addColumn('name', 'text')
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

	// Covers the everyone-in-a-date-range averages (graph average line, recap)
	// without touching the table; supersedes the old date-only index.
	await database.schema
		.createIndex('day_rates_date_value_idx')
		.ifNotExists()
		.on('day_rates')
		.columns(['date', 'value'])
		.execute()
	await database.schema.dropIndex('day_rates_date_idx').ifExists().execute()

	// Every poll answer looks up the user's existing rate for that poll.
	await database.schema
		.createIndex('day_rates_user_poll_idx')
		.ifNotExists()
		.on('day_rates')
		.columns(['user_id', 'poll_id'])
		.execute()

	await database.schema
		.createTable('groups')
		.ifNotExists()
		.addColumn('group_id', 'integer', column => column.primaryKey())
		.addColumn('is_channel', 'integer', column => column.notNull())
		.addColumn('receive_custom_polls', 'integer', column => column.notNull())
		.addColumn('receive_daily_polls', 'integer', column => column.notNull())
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
		.execute()

	await database.schema
		.createIndex('polls_date_idx')
		.ifNotExists()
		.on('polls')
		.column('date')
		.execute()
}

async function connectToDb(path: string): Promise<Database> {
	const sqlite = openSqlite(path)
	cleanupLegacySchema(sqlite)
	const database = new Kysely<DatabaseSchema>({
		dialect: createSqliteDialect(sqlite)
	})
	await migrateSchema(database)
	return database
}

export { connectToDb, migrateSchema }
