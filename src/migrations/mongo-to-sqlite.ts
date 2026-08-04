import { pathToFileURL } from 'url'
import SqliteDatabase from 'better-sqlite3'
import { MongoClient, type ObjectId } from 'mongodb'

import { loadEnv } from '../helpers/index.js'

type MongoDayRate = {
	pollId: string | number
	date?: Date
	value?: number
}

type MongoUser = {
	_id: ObjectId
	userId: number
	name?: string
	groups?: number[]
	dayRates?: MongoDayRate[]
}

type MongoGroup = {
	_id: ObjectId
	groupId: number
	isChannel?: boolean
	settings?: {
		tagUsers?: { userId: number }[]
		receiveCustomPolls?: boolean
		receiveDailyPolls?: boolean
	}
}

type MongoPoll = {
	_id: ObjectId
	pollId: string
	messageId?: number
	date: Date
}

type MongoData = {
	users: MongoUser[]
	groups: MongoGroup[]
	polls: MongoPoll[]
}

const tableNames = [
	'users',
	'user_groups',
	'day_rates',
	'groups',
	'group_tag_users',
	'polls'
] as const

function getMongoConnectionString() {
	const connectionString = process.env.DB_CONNECTION_STRING
	if (!connectionString) {
		throw new Error('DB_CONNECTION_STRING is not set')
	}
	return connectionString
}

async function readMongoData(connectionString: string): Promise<MongoData> {
	const client = new MongoClient(connectionString)
	try {
		await client.connect()
		const mongo = client.db()
		const [users, groups, polls] = await Promise.all([
			mongo.collection<MongoUser>('users').find({}).toArray(),
			mongo.collection<MongoGroup>('groups').find({}).toArray(),
			mongo.collection<MongoPoll>('polls').find({}).toArray()
		])
		return { users, groups, polls }
	} finally {
		await client.close()
	}
}

function timestamp(date: Date | undefined) {
	if (date === undefined) {
		return null
	}
	const value = date.getTime()
	if (!Number.isFinite(value)) {
		throw new Error(`Cannot migrate invalid date: ${String(date)}`)
	}
	return value
}

function createSchema(database: SqliteDatabase.Database) {
	database.pragma('foreign_keys = ON')
	database.pragma('journal_mode = WAL')
	database.exec(`
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
			receive_custom_polls INTEGER NOT NULL CHECK (receive_custom_polls IN (0, 1)),
			receive_daily_polls INTEGER NOT NULL CHECK (receive_daily_polls IN (0, 1)),
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
	`)
}

function writeSqliteData(database: SqliteDatabase.Database, data: MongoData) {
	const insertUser = database.prepare(`
		INSERT INTO users (user_id, name, mongo_id)
		VALUES (?, ?, ?)
	`)
	const insertUserGroup = database.prepare(`
		INSERT INTO user_groups (user_id, group_index, group_id)
		VALUES (?, ?, ?)
	`)
	const insertDayRate = database.prepare(`
		INSERT INTO day_rates (user_id, rate_index, poll_id, date, value)
		VALUES (?, ?, ?, ?, ?)
	`)
	const insertGroup = database.prepare(`
		INSERT INTO groups (
			group_id,
			is_channel,
			receive_custom_polls,
			receive_daily_polls,
			mongo_id
		)
		VALUES (?, ?, ?, ?, ?)
	`)
	const insertGroupTagUser = database.prepare(`
		INSERT INTO group_tag_users (group_id, user_index, user_id)
		VALUES (?, ?, ?)
	`)
	const insertPoll = database.prepare(`
		INSERT INTO polls (poll_id, message_id, date, mongo_id)
		VALUES (?, ?, ?, ?)
	`)

	const migrate = database.transaction(() => {
		database.exec(`
			DELETE FROM group_tag_users;
			DELETE FROM user_groups;
			DELETE FROM day_rates;
			DELETE FROM polls;
			DELETE FROM groups;
			DELETE FROM users;
		`)

		for (const user of data.users) {
			insertUser.run(user.userId, user.name ?? null, user._id.toHexString())
			for (const [groupIndex, groupId] of (user.groups ?? []).entries()) {
				insertUserGroup.run(user.userId, groupIndex, groupId)
			}
			for (const [rateIndex, rate] of (user.dayRates ?? []).entries()) {
				insertDayRate.run(
					user.userId,
					rateIndex,
					String(rate.pollId),
					timestamp(rate.date),
					rate.value ?? null
				)
			}
		}

		for (const group of data.groups) {
			insertGroup.run(
				group.groupId,
				Number(group.isChannel ?? false),
				Number(group.settings?.receiveCustomPolls ?? false),
				Number(group.settings?.receiveDailyPolls ?? true),
				group._id.toHexString()
			)
			for (const [userIndex, user] of (
				group.settings?.tagUsers ?? []
			).entries()) {
				insertGroupTagUser.run(group.groupId, userIndex, user.userId)
			}
		}

		for (const poll of data.polls) {
			insertPoll.run(
				poll.pollId,
				poll.messageId ?? null,
				timestamp(poll.date),
				poll._id.toHexString()
			)
		}
	})

	migrate()
}

function logSqliteData(database: SqliteDatabase.Database) {
	for (const tableName of tableNames) {
		const rows = database.prepare(`SELECT * FROM ${tableName}`).all()
		console.info(`${tableName}:`)
		console.info(JSON.stringify(rows, null, 2))
	}
}

async function main() {
	loadEnv()
	const sqlitePath = process.env.SQLITE_PATH ?? 'telegram-bot.sqlite'

	console.info('Reading MongoDB data…')
	const data = await readMongoData(getMongoConnectionString())
	console.info(
		`Read ${data.users.length} users, ${data.groups.length} groups, and ${data.polls.length} polls from MongoDB`
	)

	console.info(`Writing SQLite data to ${sqlitePath}…`)
	const sqlite = new SqliteDatabase(sqlitePath)
	try {
		createSchema(sqlite)
		writeSqliteData(sqlite, data)

		console.info('Reading and logging migrated SQLite data…')
		logSqliteData(sqlite)
	} finally {
		sqlite.close()
	}

	console.info('Done')
}

const isMainModule =
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href

if (isMainModule) {
	main().catch(error => {
		console.error(error)
		process.exitCode = 1
	})
}

export { createSchema, logSqliteData, readMongoData, writeSqliteData }
