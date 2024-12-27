import type { Document } from 'mongodb'

import { DbQueryBuilder as $ } from '../../helpers/index.js'
import type { DayRate } from '../../types/database.js'
import type { Database } from '../../types/index.js'

async function getAverageCredits(database: Database['users'], groupId: number) {
	const aggregation = database.aggregate<{ median: number }>([
		$.match({
			credits: $.elemMatch({
				groupId,
				credits: $.ne(0)
			})
		}),
		$.unwind('credits'),
		$.sort('credits.credits', 1),
		$.match({ 'credits.groupId': groupId }),
		$.group({
			_id: 'id',
			array: { $push: '$credits.credits' }
		}),
		$.project({
			_id: 0,
			array: 1,
			position: {
				$ceil: {
					$divide: [{ $size: '$array' }, 2]
				}
			}
		}),
		$.project({
			median: $.arrayElemAt('array', $.subtract('$position', 1))
		})
	])

	const [data] = await aggregation.toArray()

	return data?.median || 0
}

async function getAverageLifeQuality(
	database: Database['users'],
	groupId: number | null
) {
	const aggregation = database.aggregate<{ average: number }>([
		$.match({
			...(groupId !== null && { 'credits.groupId': groupId }),
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
			average: $.avg('lifeQuality')
		}),
		$.project({
			_id: 0,
			average: $.round('$average', 1)
		})
	])

	const [data] = await aggregation.toArray()

	return data?.average || 0
}

async function getUserMonthlyRates(
	database: Database['users'],
	userId: number | null,
	since: Date,
	to: Date
) {
	const stages: Document[] = [
		$.match({
			$expr: $.ne([$.size('$dayRates'), 0])
		}),
		$.unwind('dayRates'),
		$.sort('dayRates.date', 1),
		$.match({ 'dayRates.date': $.gte(since) }),
		$.match({ 'dayRates.date': $.lt(to) }),
		$.group({
			_id: {
				year: { $year: '$dayRates.date' },
				month: { $month: '$dayRates.date' }
			},
			date: { $first: '$dayRates.date' },
			average: $.avg('dayRates.value'),
			rates: { $push: '$dayRates' }
		})
	]
	if (userId !== null) {
		stages.unshift($.match({ userId }))
	}
	return await database
		.aggregate<{ date: Date; rates: DayRate[]; average: number }>(stages)
		.toArray()
}

async function getUserDailyRates(
	database: Database['users'],
	userId: number | null,
	since: Date,
	to: Date
) {
	const stages: Document[] = [
		$.match({
			$expr: $.ne([$.size('$dayRates'), 0])
		}),
		$.unwind('dayRates'),
		$.sort('dayRates.date', 1),
		$.match({ 'dayRates.date': $.gte(since) }),
		$.match({ 'dayRates.date': $.lt(to) }),
		{ $replaceRoot: { newRoot: '$dayRates' } },
		$.project({ date: 1, value: 1 })
	]
	if (userId !== null) {
		stages.unshift($.match({ userId }))
	}
	return await database
		.aggregate<{ date: Date; value: number }>(stages)
		.toArray()
}

export {
	getAverageCredits,
	getAverageLifeQuality,
	getUserMonthlyRates,
	getUserDailyRates
}
