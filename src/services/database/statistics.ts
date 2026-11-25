import { sql } from 'kysely'

import { mean, roundOneDecimal } from '../../helpers/math.ts'
import type { Database, DayRate } from '../../types/index.ts'

export type UserAverage = {
	userId: number
	name: string | null
	/** Mean of all the user's rates (missing values count as 0), 1 decimal. */
	lifeQuality: number
}

/**
 * Per-user life quality, optionally limited to members of a group. Averaging
 * happens in SQLite so only one row per user leaves the database.
 */
export async function getUserAverages(
	database: Database,
	groupId: number | null
): Promise<UserAverage[]> {
	let averages = database
		.selectFrom('day_rates')
		.select(['user_id', sql<number>`AVG(COALESCE(value, 0))`.as('average')])
		.groupBy('user_id')
	if (groupId !== null) {
		averages = averages.where('user_id', 'in', eb =>
			eb
				.selectFrom('user_groups')
				.select('user_id')
				.where('group_id', '=', groupId)
		)
	}
	const rows = await database
		.selectFrom(averages.as('averages'))
		.innerJoin('users', 'users.user_id', 'averages.user_id')
		.select(['users.user_id', 'users.name', 'averages.average'])
		.orderBy('users.user_id')
		.execute()
	return rows.map(row => ({
		userId: row.user_id,
		name: row.name,
		lifeQuality: roundOneDecimal(row.average)
	}))
}

/** Mean of the per-user life qualities; 0 when nobody has rated yet. */
export function averageLifeQuality(users: UserAverage[]) {
	if (users.length === 0) return 0
	return roundOneDecimal(mean(users.map(user => user.lifeQuality)))
}

export async function getAverageLifeQuality(
	database: Database,
	groupId: number | null
) {
	return averageLifeQuality(await getUserAverages(database, groupId))
}

/** Complete rates (date and value set) in `[since, to)`, oldest first. */
export async function getRatesInRange(
	database: Database,
	userId: number,
	since: Date,
	to: Date
): Promise<DayRate[]> {
	const rows = await database
		.selectFrom('day_rates')
		.select(['poll_id', 'date', 'value'])
		.where('user_id', '=', userId)
		.where('date', '>=', since.getTime())
		.where('date', '<', to.getTime())
		.where('value', 'is not', null)
		.orderBy('date')
		.orderBy('rate_index')
		.$narrowType<{ date: number; value: number }>()
		.execute()
	return rows.map(row => ({
		pollId: row.poll_id,
		date: new Date(row.date),
		value: row.value
	}))
}

/** Mean rate in `[since, to)` across everyone or one user; NaN if none. */
export async function getAverageRateInRange(
	database: Database,
	userId: number | null,
	since: Date,
	to: Date
) {
	let query = database
		.selectFrom('day_rates')
		.select(eb => eb.fn.avg<number | null>('value').as('average'))
		.where('date', '>=', since.getTime())
		.where('date', '<', to.getTime())
		.where('value', 'is not', null)
	if (userId !== null) {
		query = query.where('user_id', '=', userId)
	}
	const row = await query.executeTakeFirst()
	return row?.average ?? Number.NaN
}

/** Groups chronologically ordered rates by UTC month. */
export function groupRatesByMonth(rates: DayRate[]) {
	const months = new Map<string, DayRate[]>()
	for (const rate of rates) {
		const key = `${rate.date.getUTCFullYear()}-${rate.date.getUTCMonth()}`
		const monthRates = months.get(key)
		if (monthRates) monthRates.push(rate)
		else months.set(key, [rate])
	}
	return [...months.values()].map(monthRates => ({
		date: monthRates[0].date,
		rates: monthRates,
		average: mean(monthRates.map(rate => rate.value))
	}))
}
