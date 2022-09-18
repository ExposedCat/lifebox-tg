import { Database, UserProfile } from '../../types/index.js'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function getProfiles(
	database: Database['users'],
	changerId: number,
	targetId: number,
	groupId: number
) {
	const ids = [changerId, targetId]
	const profiles = database.aggregate<UserProfile>([
		$.match({ userId: $.in(ids) }),
		$.project({
			name: 1,
			credits: 1,
			lifeQuality: {
				$round: [{ $avg: '$dayRates.value' }, 1]
			}
		}),
		$.unwind('credits'),
		$.match({ 'credits.groupId': groupId }),
		$.addFields({
			__position: $.indexOfArray([ids, '$userId'])
		}),
		$.sort({ __position: 1 }),
		$.project({
			_id: 0,
			name: 1,
			lifeQuality: 1,
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
