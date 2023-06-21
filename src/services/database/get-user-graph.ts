import { Database, User } from '../../types/index.js'

import { DbQueryBuilder as $ } from '../../helpers/index.js'
import { Point } from '../charts.js'

function valuesAverage(array: { value: number }[]) {
	const sum = array.reduce((sum, it) => sum + it.value, 0)
	return sum / array.length
}

const forceNonNegative = (it: number) => (it > 0 ? it : 0)

async function fetchUserRatesGraph(
	database: Database['users'],
	userId: number,
	mode: 'week' | 'month' | 'year' | 'all'
) {
	const maxRates = {
		week: new Date(new Date().setDate(new Date().getDate() - 7)),
		month: new Date(new Date().setMonth(new Date().getMonth() - 1)),
		year: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
		all: new Date(new Date().setFullYear(2004))
	}[mode]
	const [user] = await database
		.aggregate<User>([
			$.match({ userId }),
			$.nestedSort('dayRates', 'date'),
			$.addFields({
				dayRates: {
					$filter: {
						input: '$dayRates',
						as: 'dayRate',
						cond: {
							$gte: ['$$dayRate.date', maxRates]
						}
					}
				}
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
			})
		])
		.toArray()

	const step = {
		week: 2,
		month: 4,
		year: 14,
		all: user.dayRates.length < 8 ? 2 : user.dayRates.length < 32 ? 4 : 14
	}[mode]

	const mapToAverage = (data: Point[]) =>
		data.map((it, i) => ({
			date: it.date,
			value: valuesAverage(
				data.slice(forceNonNegative(i - step), i + 1)
			)
		}))

	const userPoints: Point[] = mapToAverage(user.dayRates);
	const averagePoints: Point[] = mapToAverage(average);

	return { userPoints, averagePoints }
}

export { fetchUserRatesGraph }
