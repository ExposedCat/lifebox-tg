import { Median } from '../../types/index.js'
import { Collection } from 'mongodb'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function getAverageCredits(userDb: Collection, groupId: number) {
	const matchQuery = $.match({ 'credits.groupId': groupId })
	const aggregation = userDb.aggregate<Median>([
		matchQuery,
		$.unwind('credits'),
		$.sort({ 'credits.credits': 1 }),
		matchQuery,
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
