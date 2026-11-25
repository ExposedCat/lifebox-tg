import { APP_ENV } from '../../config.ts'
import { mean } from '../../helpers/math.ts'
import type { Database } from '../../types/index.ts'
import type { Dataset, Point } from '../charts.ts'
import { averageLifeQuality, getUserAverages } from './statistics.ts'

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
	// Aggregating per user before joining lets SQLite walk day_rates in
	// primary-key order instead of sorting every rate for the GROUP BY.
	let stats = database
		.selectFrom('day_rates')
		.select(eb => [
			'user_id',
			eb.fn.avg<number>('value').as('average'),
			eb.fn.count<number>('value').as('rate_count'),
			eb.fn.max<number>('date').as('last_rate')
		])
		.where('value', 'is not', null)
		.groupBy('user_id')
	if (groupId !== null) {
		stats = stats.where('user_id', 'in', eb =>
			eb
				.selectFrom('user_groups')
				.select('user_id')
				.where('group_id', '=', groupId)
		)
	}
	const rows = await database
		.selectFrom(stats.as('stats'))
		.innerJoin('users', 'users.user_id', 'stats.user_id')
		.select([
			'users.user_id',
			'users.name',
			'stats.average',
			'stats.rate_count'
		])
		.where('stats.rate_count', '>=', MIN_BOARD_VOTES)
		.where('stats.last_rate', '>=', halfYearAgo.getTime())
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
		happiest: rankedUsers
			.toSorted((a, b) => b.average - a.average || byUserId(a, b))
			.slice(0, BOARD_SIZE),
		saddest: rankedUsers
			.toSorted((a, b) => a.average - b.average || byUserId(a, b))
			.slice(0, BOARD_SIZE),
		idiots: idiots
			.toSorted(
				(a, b) =>
					Math.abs(b.average) - Math.abs(a.average) ||
					b.rateCount - a.rateCount ||
					byUserId(a, b)
			)
			.slice(0, BOARD_SIZE)
	}
}

export type GraphMode = 'week' | 'month' | 'halfYear' | 'year' | 'all'

function graphStart(mode: GraphMode) {
	const date = new Date()
	switch (mode) {
		case 'week':
			date.setDate(date.getDate() - 7)
			break
		case 'month':
			date.setMonth(date.getMonth() - 1)
			break
		case 'halfYear':
			date.setMonth(date.getMonth() - 6)
			break
		case 'year':
			date.setFullYear(date.getFullYear() - 1)
			break
		case 'all':
			date.setFullYear(2004)
			break
	}
	return date
}

/** How many previous points each smoothed point averages over. */
const SMOOTHING_STEP: Record<GraphMode, number> = {
	week: 2,
	month: 4,
	halfYear: 7,
	year: 14,
	all: 14
}

function smooth(data: Point[], step: number): Point[] {
	return data.map((point, i) => ({
		date: point.date,
		value: mean(data.slice(Math.max(0, i - step), i + 1).map(it => it.value))
	}))
}

export async function fetchUserRatesGraph(args: {
	database: Database
	userIds: number[]
	mode: GraphMode
}) {
	const { database, userIds, mode } = args
	const since = graphStart(mode).getTime()

	const [users, userRates, averages] = await Promise.all([
		database
			.selectFrom('users')
			.select(['user_id', 'name'])
			.where('user_id', 'in', userIds)
			.execute(),
		database
			.selectFrom('day_rates')
			.select(['user_id', 'date', 'value'])
			.where('user_id', 'in', userIds)
			.where('date', '>=', since)
			.where('value', 'is not', null)
			.orderBy('date')
			.orderBy('rate_index')
			.$narrowType<{ date: number; value: number }>()
			.execute(),
		// Everyone's mean per poll date, aggregated in SQLite.
		database
			.selectFrom('day_rates')
			.select(eb => ['date', eb.fn.avg<number>('value').as('value')])
			.where('date', '>=', since)
			.where('value', 'is not', null)
			.groupBy('date')
			.orderBy('date')
			.$narrowType<{ date: number }>()
			.execute()
	])

	const ratesByUser = new Map<number, Point[]>()
	for (const rate of userRates) {
		const point = { date: new Date(rate.date), value: rate.value }
		const rates = ratesByUser.get(rate.user_id)
		if (rates) rates.push(point)
		else ratesByUser.set(rate.user_id, [point])
	}

	const average: Point[] = averages.map(row => ({
		date: new Date(row.date),
		value: row.value
	}))
	if (average.length === 1) {
		average.push(average[0])
	}

	const step = SMOOTHING_STEP[mode]
	const userDatasets: Dataset[] = users.map(user => ({
		userId: user.user_id,
		label: user.name ?? `User#${user.user_id}`,
		points: smooth(ratesByUser.get(user.user_id) ?? [], step)
	}))
	const averagePoints = smooth(average, step)

	return { userDatasets, averagePoints }
}

export async function getTopLifeUsers(database: Database, groupId: number) {
	const users = await getUserAverages(database, groupId)
	if (users.length === 0) {
		return { list: [], average: 0 }
	}
	return {
		list: users
			.toSorted((a, b) => b.lifeQuality - a.lifeQuality)
			.slice(0, APP_ENV.RATING_LIMIT)
			.map(user => ({
				name: user.name ?? undefined,
				lifeQuality: user.lifeQuality
			})),
		average: averageLifeQuality(users)
	}
}
