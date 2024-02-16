import type {
	Database,
	User,
	UserLifeQuality,
	UserProfile
} from '../../types/index.js'
import { DbQueryBuilder as $ } from '../../helpers/index.js'
import type { Dataset, Point } from '../charts.js'

function valuesAverage(array: { value: number }[]) {
	const sum = array.reduce((sum, it) => sum + it.value, 0)
	return sum / array.length
}

const forceNonNegative = (it: number) => (it > 0 ? it : 0)

export async function fetchUserRatesGraph(args: {
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

	const userDatasets: Dataset[] = users.map(user => ({
		userId: user.userId,
		label: user.name ?? `User#${user.userId}`,
		points: mapToAverage(user.dayRates)
	}))
	const averagePoints: Point[] = mapToAverage(average)

	return { userDatasets, averagePoints }
}

export async function getTopSocialUsers(
	database: Database['users'],
	groupId: number
) {
	const aggregation = database.aggregate<{
		list: UserProfile[]
		average: number
	}>([
		$.match({
			credits: $.elemMatch({
				groupId,
				credits: $.ne(0)
			})
		}),
		$.unwind('credits'),
		$.match({ 'credits.groupId': groupId }),
		$.project({
			_id: 0,
			name: 1,
			credits: '$credits.credits'
		}),
		$.sort('credits', -1),
		$.group({
			_id: null,
			list: {
				$push: '$$ROOT'
			}
		}),
		$.project({
			_id: 0,
			list: $.slice('list', Number(process.env.RATING_LIMIT)),
			average: $.arrayElemAt(
				'list.credits',
				$.subtract($.ceil($.divide($.size('$list'), 2)), 1)
			)
		})
	])

	const [data] = await aggregation.toArray()

	return data || { list: [], average: 0 }
}

export async function getTopLifeUsers(
	database: Database['users'],
	groupId: number
) {
	const aggregation = database.aggregate<{
		list: UserLifeQuality[]
		average: number
	}>([
		$.match({
			'credits.groupId': groupId,
			$expr: {
				$ne: [{ $size: '$dayRates' }, 0]
			}
		}),
		$.project({
			_id: 0,
			name: 1,
			lifeQuality: $.round(
				$.divide($.sum('$dayRates.value'), $.size('$dayRates')),
				1
			)
		}),
		$.sort('lifeQuality', -1),
		$.group({
			_id: null,
			average: $.avg('lifeQuality'),
			list: $.push('$$ROOT')
		}),
		$.project({
			_id: 0,
			list: $.slice('list', Number(process.env.RATING_LIMIT)),
			average: $.round('$average', 1)
		})
	])

	const [data] = await aggregation.toArray()

	return data || { list: [], average: 0 }
}
