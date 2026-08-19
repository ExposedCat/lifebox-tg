import { sql } from 'kysely'

import type { Database, UserProfile } from '../../types/index.js'
import { getValueState } from '../statistics/get-value-state.js'
import { getAverageLifeQuality } from './statistics.js'

const roundOneDecimal = (value: number) => Math.round(value * 10) / 10

export async function createUserIfNotExists(
	database: Database,
	id: number,
	name: string,
	initialGroupId: number
) {
	await database.transaction().execute(async transaction => {
		await transaction
			.insertInto('users')
			.values({
				user_id: id,
				name: name || null
			})
			.onConflict(conflict => conflict.column('user_id').doNothing())
			.execute()

		if (name) {
			await transaction
				.updateTable('users')
				.set({ name })
				.where('user_id', '=', id)
				.execute()
		}

		const existingGroup = await transaction
			.selectFrom('user_groups')
			.select('user_id')
			.where('user_id', '=', id)
			.where('group_id', '=', initialGroupId)
			.executeTakeFirst()
		if (!existingGroup) {
			await transaction
				.insertInto('user_groups')
				.values({
					user_id: id,
					group_id: initialGroupId,
					group_index: sql<number>`(
						SELECT COALESCE(MAX(group_index), -1) + 1
						FROM user_groups
						WHERE user_id = ${id}
					)`
				})
				.execute()
		}
	})
}

export async function updateUserDayRate(
	database: Database,
	id: number,
	name: string,
	pollId: string,
	value: number,
	date: Date
) {
	await database.transaction().execute(async transaction => {
		await transaction
			.insertInto('users')
			.values({ user_id: id, name })
			.onConflict(conflict => conflict.column('user_id').doUpdateSet({ name }))
			.execute()

		const existingRate = await transaction
			.selectFrom('day_rates')
			.select('rate_index')
			.where('user_id', '=', id)
			.where('poll_id', '=', pollId)
			.orderBy('rate_index')
			.executeTakeFirst()

		if (existingRate) {
			await transaction
				.updateTable('day_rates')
				.set({ value, date: date.getTime() })
				.where('user_id', '=', id)
				.where('rate_index', '=', existingRate.rate_index)
				.execute()
			return
		}

		await transaction
			.insertInto('day_rates')
			.values({
				user_id: id,
				poll_id: pollId,
				value,
				date: date.getTime(),
				rate_index: sql<number>`(
					SELECT COALESCE(MAX(rate_index), -1) + 1
					FROM day_rates
					WHERE user_id = ${id}
				)`
			})
			.execute()
	})
}

export async function getUserProfile(
	database: Database,
	userId: number,
	localGroupId: number,
	calcAverage: boolean
) {
	const row = await database
		.selectFrom('users')
		.leftJoin('day_rates', 'day_rates.user_id', 'users.user_id')
		.select(['users.name', database.fn.avg('day_rates.value').as('average')])
		.where('users.user_id', '=', userId)
		.groupBy('users.user_id')
		.executeTakeFirst()
	if (!row) {
		return null
	}

	const user: UserProfile = {
		name: row.name ?? undefined,
		lifeQuality: roundOneDecimal(Number(row.average ?? 0))
	}

	let state: string | null = null
	let averageLifeQuality: number | null = null
	if (calcAverage) {
		averageLifeQuality = await getAverageLifeQuality(database, localGroupId)
		state = getValueState(user.lifeQuality, averageLifeQuality)
	}

	return { user, averageLifeQuality, state }
}
