import { Database, UserProfile } from '../../types/index.js'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function getTopSocialUsers(database: Database['users'], groupId: number) {
	const matchQuery = $.match({ 'credits.groupId': groupId })
	const aggregation = database.aggregate<UserProfile>([
		matchQuery,
		$.unwind('credits'),
		matchQuery,
		$.limit(Number(process.env.RATING_LIMIT)),
		$.sort({ 'credits.credits': -1 }),
		$.project({
			_id: 0,
			name: 1,
			credits: '$credits.credits',
			lastRated: '$credits.lastRated'
		})
	])

	const users = await aggregation.toArray()

	return users
}

export { getTopSocialUsers }
