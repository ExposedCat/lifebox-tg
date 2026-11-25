import { sql } from 'kysely'

import { roundOneDecimal } from '../../helpers/math.ts'
import type { Database, UserProfile } from '../../types/index.ts'
import { getValueState } from '../statistics/get-value-state.ts'
import { getAverageLifeQuality } from './statistics.ts'

// Upserts the user, rewriting the name only when it actually changed so the
// hot path (every group message) does not dirty the database.
async function upsertUser(database: Database, id: number, name: string | null) {
	await database
		.insertInto('users')
		.values({ user_id: id, name })
		.onConflict(conflict =>
			name === null
				? conflict.column('user_id').doNothing()
				: conflict
						.column('user_id')
						.doUpdateSet({ name })
						.where(sql<boolean>`users.name IS NOT excluded.name`)
		)
		.execute()
}

export async function createUserIfNotExists(
	database: Database,
	id: number,
	name: string,
	initialGroupId: number
) {
	await database.transaction().execute(async transaction => {
		await upsertUser(transaction, id, name || null)
		// Appends the membership unless the user is already in that group.
		await transaction
			.insertInto('user_groups')
			.columns(['user_id', 'group_id', 'group_index'])
			.expression(eb =>
				eb
					.selectFrom('user_groups')
					.select([
						eb.val(id).as('user_id'),
						eb.val(initialGroupId).as('group_id'),
						sql<number>`COALESCE(MAX(group_index), -1) + 1`.as('group_index')
					])
					.where('user_id', '=', id)
					.having(
						sql<number>`COUNT(CASE WHEN group_id = ${initialGroupId} THEN 1 END)`,
						'=',
						0
					)
			)
			.execute()
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
		await upsertUser(transaction, id, name)

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
	localGroupId: number
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
	const averageLifeQuality = await getAverageLifeQuality(database, localGroupId)
	const state = getValueState(user.lifeQuality, averageLifeQuality)

	return { user, averageLifeQuality, state }
}
