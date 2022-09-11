import { User } from '../../types/index.js'
import { Collection } from 'mongodb'

import { AggregationBuilder as $ } from '../../helpers/index.js'
import { getAverageCredits } from '../index.js'
import { getCreditState } from '../index.js'

async function getUserProfile(
	userDb: Collection,
	userId: number,
	localGroupId: number
) {
	const averageCredits = await getAverageCredits(userDb, localGroupId)
	const users = userDb.aggregate<User>([
		$.match({ userId }),
		$.unwind('credits'),
		$.match({ 'credits.groupId': localGroupId }),
		$.project({ userId: 1, name: 1, credits: '$credits.credits' })
	])

	const user = await users.next()
	if (!user) {
		return null
	}

	const state = getCreditState(user.credits, averageCredits)

	return { user, averageCredits, state }
}

export { getUserProfile }
