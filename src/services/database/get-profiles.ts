import { User } from '../../types/index.js'
import { Collection } from 'mongodb'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function getProfiles(
	userDb: Collection,
	changerId: number,
	targetId: number,
	groupId: number
) {
	const ids = [changerId, targetId]
	const profiles = userDb.aggregate<User>([
		$.match({ userId: $.in(ids) }),
		$.unwind('credits'),
		$.match({ 'credits.groupId': groupId }),
		$.addFields({
			__position: $.indexOfArray([ids, '$userId'])
		}),
		$.sort({ __position: 1 }),
		$.project({
			_id: 0,
			credits: '$credits.credits',
			lastRated: '$credits.lastRated'
		})
	])

	const changer = await profiles.next()
	const target = await profiles.next()

	return {
		changer: changer,
		target: target
	}
}

export { getProfiles }
