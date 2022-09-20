import { Database } from '../../types/index.js'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

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
	groupId: number
) {
	const aggregation = database.aggregate<{ average: number }>([
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

export { getAverageCredits, getAverageLifeQuality }
