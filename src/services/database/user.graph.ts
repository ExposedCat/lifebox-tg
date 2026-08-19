import type { Database, UserLifeQuality } from '../../types/index.js'
import type { Dataset, Point } from '../charts.js'

function valuesAverage(array: { value: number }[]) {
	const sum = array.reduce((sum, it) => sum + it.value, 0)
	return sum / array.length
}

const forceNonNegative = (it: number) => (it > 0 ? it : 0)
const roundOneDecimal = (value: number) => Math.round(value * 10) / 10

const BOARD_SIZE = 10
const MIN_BOARD_VOTES = 10
const EXTREME_AVERAGE = 2
const EXTREME_TOLERANCE = 0.1

export type BoardUser = {
	userId: number
	name: string | null
	average: number
	rateCount: number
}

export type LifeQualityBoards = {
	happiest: BoardUser[]
	saddest: BoardUser[]
	idiots: BoardUser[]
}

function isExtremeAverage(average: number) {
	return (
		Math.abs(Math.abs(average) - EXTREME_AVERAGE) <=
		EXTREME_TOLERANCE + Number.EPSILON
	)
}

export async function getLifeQualityBoards(
	database: Database,
	groupId: number | null
): Promise<LifeQualityBoards> {
	const halfYearAgo = new Date()
	halfYearAgo.setMonth(halfYearAgo.getMonth() - 6)
	const rateCount = database.fn.count<number>('day_rates.value')
	const lastRateDate = database.fn.max<number>('day_rates.date')
	const query = database
		.selectFrom('users')
		.innerJoin('day_rates', 'day_rates.user_id', 'users.user_id')
		.select([
			'users.user_id',
			'users.name',
			database.fn.avg('day_rates.value').as('average'),
			rateCount.as('rate_count')
		])
		.where('day_rates.value', 'is not', null)
	const rows = await (groupId === null
		? query
		: query
				.innerJoin('user_groups', 'user_groups.user_id', 'users.user_id')
				.where('user_groups.group_id', '=', groupId)
	)
		.groupBy(['users.user_id', 'users.name'])
		.having(rateCount, '>=', MIN_BOARD_VOTES)
		.having(lastRateDate, '>=', halfYearAgo.getTime())
		.execute()

	const users: BoardUser[] = rows.map(row => ({
		userId: row.user_id,
		name: row.name,
		average: Number(row.average),
		rateCount: Number(row.rate_count)
	}))
	const idiots = users.filter(user => isExtremeAverage(user.average))
	const rankedUsers = users.filter(user => !isExtremeAverage(user.average))
	const byUserId = (a: BoardUser, b: BoardUser) => a.userId - b.userId

	return {
		happiest: [...rankedUsers]
			.sort((a, b) => b.average - a.average || byUserId(a, b))
			.slice(0, BOARD_SIZE),
		saddest: [...rankedUsers]
			.sort((a, b) => a.average - b.average || byUserId(a, b))
			.slice(0, BOARD_SIZE),
		idiots: [...idiots]
			.sort(
				(a, b) =>
					Math.abs(b.average) - Math.abs(a.average) ||
					b.rateCount - a.rateCount ||
					byUserId(a, b)
			)
			.slice(0, BOARD_SIZE)
	}
}

export async function fetchUserRatesGraph(args: {
	database: Database
	userIds: number[]
	mode: 'week' | 'month' | 'halfYear' | 'year' | 'all'
}) {
	const { database, userIds, mode } = args
	const maxRates = {
		week: new Date(new Date().setDate(new Date().getDate() - 7)),
		month: new Date(new Date().setMonth(new Date().getMonth() - 1)),
		halfYear: new Date(new Date().setMonth(new Date().getMonth() - 6)),
		year: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
		all: new Date(new Date().setFullYear(2004))
	}[mode]

	const [users, userRates, allRates] = await Promise.all([
		database
			.selectFrom('users')
			.select(['user_id', 'name'])
			.where('user_id', 'in', userIds)
			.execute(),
		database
			.selectFrom('day_rates')
			.select(['user_id', 'date', 'value'])
			.where('user_id', 'in', userIds)
			.where('date', '>=', maxRates.getTime())
			.where('date', 'is not', null)
			.where('value', 'is not', null)
			.orderBy('date')
			.orderBy('rate_index')
			.execute(),
		database
			.selectFrom('day_rates')
			.select(['date', 'value'])
			.where('date', '>=', maxRates.getTime())
			.where('date', 'is not', null)
			.where('value', 'is not', null)
			.orderBy('date')
			.execute()
	])

	const ratesByUser = new Map<number, Point[]>()
	for (const rate of userRates) {
		if (rate.date === null || rate.value === null) continue
		const rates = ratesByUser.get(rate.user_id) ?? []
		rates.push({ date: new Date(rate.date), value: rate.value })
		ratesByUser.set(rate.user_id, rates)
	}

	const valuesByDate = new Map<number, number[]>()
	for (const rate of allRates) {
		if (rate.date === null || rate.value === null) continue
		const values = valuesByDate.get(rate.date) ?? []
		values.push(rate.value)
		valuesByDate.set(rate.date, values)
	}
	const average: Point[] = [...valuesByDate.entries()].map(
		([date, values]) => ({
			date: new Date(date),
			value: values.reduce((sum, value) => sum + value, 0) / values.length
		})
	)
	if (average.length === 1) {
		average.push(average[0])
	}

	const step = {
		week: 2,
		month: 4,
		halfYear: 7,
		year: 14,
		all: 14
	}[mode]

	const mapToAverage = (data: Point[]): Point[] =>
		data.map((it, i) => ({
			date: it.date,
			value: valuesAverage(data.slice(forceNonNegative(i - step), i + 1))
		}))

	const userDatasets: Dataset[] = users.map(user => ({
		userId: user.user_id,
		label: user.name ?? `User#${user.user_id}`,
		points: mapToAverage(ratesByUser.get(user.user_id) ?? [])
	}))
	const averagePoints: Point[] = mapToAverage(average)

	return { userDatasets, averagePoints }
}

export async function getTopLifeUsers(database: Database, groupId: number) {
	const rows = await database
		.selectFrom('users')
		.innerJoin('user_groups', 'user_groups.user_id', 'users.user_id')
		.innerJoin('day_rates', 'day_rates.user_id', 'users.user_id')
		.select(['users.user_id', 'users.name', 'day_rates.value'])
		.where('user_groups.group_id', '=', groupId)
		.execute()

	const users = new Map<
		number,
		{ name: string | null; values: (number | null)[] }
	>()
	for (const row of rows) {
		const user = users.get(row.user_id) ?? { name: row.name, values: [] }
		user.values.push(row.value)
		users.set(row.user_id, user)
	}

	const allUsers: UserLifeQuality[] = [...users.values()]
		.map(user => ({
			name: user.name ?? undefined,
			lifeQuality: roundOneDecimal(
				user.values.reduce<number>((sum, value) => sum + (value ?? 0), 0) /
					user.values.length
			)
		}))
		.sort((a, b) => b.lifeQuality - a.lifeQuality)

	if (allUsers.length === 0) {
		return { list: [], average: 0 }
	}

	const average = roundOneDecimal(
		allUsers.reduce((sum, user) => sum + user.lifeQuality, 0) / allUsers.length
	)
	return {
		list: allUsers.slice(0, Number(process.env.RATING_LIMIT)),
		average
	}
}
