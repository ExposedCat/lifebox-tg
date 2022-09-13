import { User } from '../../types/index.js'
import { Collection } from 'mongodb'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function getTopSocialUsers(userDb: Collection, groupId: number) {
	const matchQuery = $.match({ 'credits.groupId': groupId })
	const aggregation = userDb.aggregate<User>([
		matchQuery,
		$.unwind('credits'),
		matchQuery,
		$.limit(Number(process.env.RATING_LIMIT)),
		$.sort({ 'credits.credits': -1 }),
		$.project({
			_id: 0,
			userId: 1,
			name: 1,
			credits: '$credits.credits'
		})
	])

	const users = await aggregation.toArray()

	return users
}

export { getTopSocialUsers }
