import { User } from '../../types/index.js'
import { Collection } from 'mongodb'

import { DbQueryBuilder as $ } from '../../helpers/index.js'
import { getAverageCredits } from '../index.js'
import { getCreditState } from '../index.js'

async function getUserProfile(
	userDb: Collection,
	userId: number,
	localGroupId: number,
	calcState: boolean
) {
	const users = userDb.aggregate<User>([
		$.match({ userId }),
		$.unwind('credits'),
		$.match({ 'credits.groupId': localGroupId }),
		$.project({
			userId: 1,
			name: 1,
			credits: '$credits.credits',
			lastRated: '$credits.lastRated'
		})
	])

	const user = await users.next()
	if (!user) {
		return null
	}

	let state: string | null = null
	let averageCredits: number | null = null
	if (calcState) {
		averageCredits = await getAverageCredits(userDb, localGroupId)
		state = getCreditState(user.credits, averageCredits)
	}

	return { user, averageCredits, state }
}

export { getUserProfile }
