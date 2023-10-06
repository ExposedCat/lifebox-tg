import type { Database, User } from '../../types/index.js'
import { DbQueryBuilder as $ } from '../../helpers/index.js'
import type { Dataset, Point } from '../charts.js'

function valuesAverage(array: { value: number }[]) {
	const sum = array.reduce((sum, it) => sum + it.value, 0)
	return sum / array.length
}

const forceNonNegative = (it: number) => (it > 0 ? it : 0)

async function fetchUserRatesGraph(args: {
	database: Database['users']
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

	const users = await database
		.aggregate<User>([
			$.match({ userId: $.in(userIds) }),
			$.nestedSort('dayRates', 'date'),
			$.addFields({
				dayRates: $.filter(
					'dayRates',
					'dayRate',
					$.cond.gte('dayRate.date', maxRates)
				)
			})
		])
		.toArray()

	const average = await database
		.aggregate<Point>([
			$.unwind('dayRates'),
			$.group({
				_id: '$dayRates.date',
				value: $.avg('dayRates.value')
			}),
			$.match({
				_id: $.gte(maxRates)
			}),
			$.project({
				_id: 0,
				date: '$_id',
				value: 1
			}),
			$.sort('date')
		])
		.toArray()

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

	const userDatasets: Dataset[] = users.map(it => ({
		label: it.name ?? `User#${it.userId}`,
		points: mapToAverage(it.dayRates)
	}))
	const averagePoints: Point[] = mapToAverage(average)

	return { userDatasets, averagePoints }
}

export { fetchUserRatesGraph }
