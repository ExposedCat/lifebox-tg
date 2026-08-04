import type { Database, DayRate } from '../../types/index.js'

const roundOneDecimal = (value: number) => Math.round(value * 10) / 10

async function getAverageLifeQuality(
	database: Database,
	groupId: number | null
) {
	let query = database
		.selectFrom('day_rates')
		.innerJoin('users', 'users.user_id', 'day_rates.user_id')
		.select(['day_rates.user_id', 'day_rates.value'])

	if (groupId !== null) {
		query = query
			.innerJoin('user_groups', 'user_groups.user_id', 'users.user_id')
			.where('user_groups.group_id', '=', groupId)
	}

	const rows = await query.execute()
	const values = new Map<number, (number | null)[]>()
	for (const row of rows) {
		const userValues = values.get(row.user_id) ?? []
		userValues.push(row.value)
		values.set(row.user_id, userValues)
	}

	const userAverages = [...values.values()].map(userValues =>
		roundOneDecimal(
			userValues.reduce<number>((sum, value) => sum + (value ?? 0), 0) /
				userValues.length
		)
	)
	if (userAverages.length === 0) {
		return 0
	}
	return roundOneDecimal(
		userAverages.reduce((sum, value) => sum + value, 0) / userAverages.length
	)
}

type RateRow = {
	poll_id: string
	date: number | null
	value: number | null
}

function mapCompleteRate(row: RateRow): DayRate | null {
	if (row.date === null || row.value === null) {
		return null
	}
	return {
		pollId: row.poll_id,
		date: new Date(row.date),
		value: row.value
	}
}

async function getRatesInRange(
	database: Database,
	userId: number | null,
	since: Date,
	to: Date
) {
	let query = database
		.selectFrom('day_rates')
		.select(['poll_id', 'date', 'value'])
		.where('date', '>=', since.getTime())
		.where('date', '<', to.getTime())
		.orderBy('date')
		.orderBy('rate_index')
	if (userId !== null) {
		query = query.where('user_id', '=', userId)
	}
	const rows = await query.execute()
	return rows
		.map(mapCompleteRate)
		.filter((rate): rate is DayRate => rate !== null)
}

async function getUserMonthlyRates(
	database: Database,
	userId: number | null,
	since: Date,
	to: Date
) {
	const rates = await getRatesInRange(database, userId, since, to)
	const months = new Map<string, DayRate[]>()
	for (const rate of rates) {
		const key = `${rate.date.getUTCFullYear()}-${rate.date.getUTCMonth()}`
		const monthRates = months.get(key) ?? []
		monthRates.push(rate)
		months.set(key, monthRates)
	}

	return [...months.values()].map(monthRates => ({
		date: monthRates[0].date,
		rates: monthRates,
		average:
			monthRates.reduce((sum, rate) => sum + rate.value, 0) / monthRates.length
	}))
}

async function getUserDailyRates(
	database: Database,
	userId: number | null,
	since: Date,
	to: Date
) {
	const rates = await getRatesInRange(database, userId, since, to)
	return rates.map(({ date, value }) => ({ date, value }))
}

export { getAverageLifeQuality, getUserMonthlyRates, getUserDailyRates }
