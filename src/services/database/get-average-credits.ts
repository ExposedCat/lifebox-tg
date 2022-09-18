import { Database, Median } from '../../types/index.js'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function getAverageCredits(database: Database['users'], groupId: number) {
	const aggregation = database.aggregate<Median>([
		$.match({
			credits: $.elemMatch({
				groupId,
				credits: $.ne(0)
			})
		}),
		$.unwind('credits'),
		$.sort({ 'credits.credits': 1 }),
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
			median: $.arrayElemAt(['$array', $.subtract(['$position', 1])])
		})
	])

	const data = await aggregation.next()
	const median = data?.median || 0

	return median
}

export { getAverageCredits }
