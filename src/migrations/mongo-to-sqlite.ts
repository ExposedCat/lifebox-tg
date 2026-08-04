import { MongoClient } from 'mongodb'

import type { Database } from '../types/index.js'

const MIGRATION_NAME = 'mongodb-to-sqlite-v1'

type MongoDayRate = {
	pollId: string | number
	date?: Date
	value?: number
}

type MongoUser = {
	_id?: unknown
	userId: number
	name?: string
	groups?: number[]
	dayRates?: MongoDayRate[]
}

type MongoGroup = {
	_id?: unknown
	groupId: number
	isChannel?: boolean
	settings?: {
		tagUsers?: { userId: number }[]
		receiveCustomPolls?: boolean
		receiveDailyPolls?: boolean
	}
}

type MongoPoll = {
	_id?: unknown
	pollId: string | number
	messageId?: number
	date: Date
}

type MongoData = {
	users: MongoUser[]
	groups: MongoGroup[]
	polls: MongoPoll[]
}

function requiredId(value: string | number, label: string): string {
	if (value === undefined || value === null) {
		throw new Error(`Cannot migrate ${label} without an ID`)
	}
	return String(value)
}

function timestamp(value: Date | undefined): number | null {
	if (value === undefined) {
		return null
	}
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		throw new Error(`Cannot migrate invalid date: ${String(value)}`)
	}
	return value.getTime()
}

async function readMongoData(connectionString: string): Promise<MongoData> {
	// MongoDB is intentionally isolated to this function. The client is configured
	// without retryable writes and this adapter exposes only find operations.
	const client = new MongoClient(connectionString, {
		readPreference: 'primary',
		retryWrites: false
	})

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

async function replaceSqliteData(database: Database, data: MongoData) {
	await database.transaction().execute(async transaction => {
		for (const table of [
			'group_tag_users',
			'user_groups',
			'day_rates',
			'polls',
			'groups',
			'users'
		] as const) {
			await transaction.deleteFrom(table).execute()
		}

		for (const user of data.users) {
			await transaction
				.insertInto('users')
				.values({
					user_id: user.userId,
					name: user.name ?? null,
					mongo_id: String(user._id ?? '')
				})
				.execute()

			for (const [groupIndex, groupId] of (user.groups ?? []).entries()) {
				await transaction
					.insertInto('user_groups')
					.values({
						user_id: user.userId,
						group_index: groupIndex,
						group_id: groupId
					})
					.execute()
			}

			for (const [rateIndex, rate] of (user.dayRates ?? []).entries()) {
				await transaction
					.insertInto('day_rates')
					.values({
						user_id: user.userId,
						rate_index: rateIndex,
						poll_id: requiredId(rate.pollId, 'day rate'),
						date: timestamp(rate.date),
						value: rate.value ?? null
					})
					.execute()
			}
		}

		for (const group of data.groups) {
			await transaction
				.insertInto('groups')
				.values({
					group_id: group.groupId,
					is_channel: Number(group.isChannel ?? false),
					receive_custom_polls: Number(
						group.settings?.receiveCustomPolls ?? false
					),
					receive_daily_polls: Number(
						group.settings?.receiveDailyPolls ?? true
					),
					mongo_id: String(group._id ?? '')
				})
				.execute()

			for (const [userIndex, user] of (
				group.settings?.tagUsers ?? []
			).entries()) {
				await transaction
					.insertInto('group_tag_users')
					.values({
						group_id: group.groupId,
						user_index: userIndex,
						user_id: user.userId
					})
					.execute()
			}
		}

		for (const poll of data.polls) {
			const pollId = requiredId(poll.pollId, 'poll')
			const date = timestamp(poll.date)
			if (date === null) {
				throw new Error(`Poll ${pollId} has no date`)
			}
			await transaction
				.insertInto('polls')
				.values({
					poll_id: pollId,
					message_id: poll.messageId ?? null,
					date,
					mongo_id: String(poll._id ?? '')
				})
				.execute()
		}

		const [users, userGroups, dayRates, groups, groupTagUsers, polls] =
			await Promise.all([
				transaction
					.selectFrom('users')
					.select(transaction.fn.countAll<number>().as('count'))
					.executeTakeFirstOrThrow(),
				transaction
					.selectFrom('user_groups')
					.select(transaction.fn.countAll<number>().as('count'))
					.executeTakeFirstOrThrow(),
				transaction
					.selectFrom('day_rates')
					.select(transaction.fn.countAll<number>().as('count'))
					.executeTakeFirstOrThrow(),
				transaction
					.selectFrom('groups')
					.select(transaction.fn.countAll<number>().as('count'))
					.executeTakeFirstOrThrow(),
				transaction
					.selectFrom('group_tag_users')
					.select(transaction.fn.countAll<number>().as('count'))
					.executeTakeFirstOrThrow(),
				transaction
					.selectFrom('polls')
					.select(transaction.fn.countAll<number>().as('count'))
					.executeTakeFirstOrThrow()
			])

		const expectedUserGroups = data.users.reduce(
			(count, user) => count + (user.groups?.length ?? 0),
			0
		)
		const expectedDayRates = data.users.reduce(
			(count, user) => count + (user.dayRates?.length ?? 0),
			0
		)
		const expectedGroupTagUsers = data.groups.reduce(
			(count, group) => count + (group.settings?.tagUsers?.length ?? 0),
			0
		)

		if (
			Number(users.count) !== data.users.length ||
			Number(userGroups.count) !== expectedUserGroups ||
			Number(dayRates.count) !== expectedDayRates ||
			Number(groups.count) !== data.groups.length ||
			Number(groupTagUsers.count) !== expectedGroupTagUsers ||
			Number(polls.count) !== data.polls.length
		) {
			throw new Error('SQLite row counts do not match MongoDB source counts')
		}

		await transaction
			.insertInto('migration_state')
			.values({ name: MIGRATION_NAME, completed_at: Date.now() })
			.onConflict(conflict =>
				conflict.column('name').doUpdateSet({ completed_at: Date.now() })
			)
			.execute()
	})
}

async function migrateMongoToSqlite(database: Database) {
	const completed = await database
		.selectFrom('migration_state')
		.select('name')
		.where('name', '=', MIGRATION_NAME)
		.executeTakeFirst()
	if (completed) {
		console.info('MongoDB to SQLite migration already completed; skipping')
		return false
	}

	const connectionString = process.env.DB_CONNECTION_STRING
	if (!connectionString) {
		throw new Error(
			'DB_CONNECTION_STRING is required for the startup migration'
		)
	}

	console.info('Reading migration source from MongoDB (read-only)')
	const data = await readMongoData(connectionString)
	console.info(
		`Read ${data.users.length} users, ${data.groups.length} groups, and ${data.polls.length} polls from MongoDB`
	)

	await replaceSqliteData(database, data)
	console.info('MongoDB to SQLite migration completed')
	return true
}

export { MIGRATION_NAME, migrateMongoToSqlite }
