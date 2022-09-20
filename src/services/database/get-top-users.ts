import { Database, UserLifeQuality, UserProfile } from '../../types/index.js'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function getTopSocialUsers(database: Database['users'], groupId: number) {
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

async function getTopLifeUsers(database: Database['users'], groupId: number) {
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

export { getTopSocialUsers, getTopLifeUsers }
