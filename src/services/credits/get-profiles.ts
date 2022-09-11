import { Collection } from 'mongodb'

import { AggregationBuilder as $ } from '../../helpers/index.js'

async function getProfiles(
	userDb: Collection,
	changerId: number,
	targetId: number,
	groupId: number
) {
	const ids = [changerId, targetId]
	const profiles = userDb.aggregate<{ credits: number }>([
		$.match({ userId: $.in(ids) }),
		$.unwind('$credits'),
		$.match({ 'credits.groupId': groupId }),
		$.addFields({
			__position: $.indexOfArray([ids, '$key'])
		}),
		$.sort({ __position: 1 }),
		$.project({ _id: 0, credits: '$credits.credits' })
	])

	const changer = await profiles.next()
	const target = await profiles.next()

	return {
		changer: changer?.credits || 0,
		target: target?.credits || 0
	}
}

export { getProfiles }
