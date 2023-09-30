import type { Database, UserProfile } from '../../types/index.js'
import { DbQueryBuilder as $ } from '../../helpers/index.js'
import {
	getAverageCredits,
	getAverageLifeQuality,
	getValueState
} from '../index.js'

async function getUserProfile(
	database: Database['users'],
	userId: number,
	localGroupId: number,
	calcAverage: boolean
) {
	const users = database.aggregate<UserProfile>([
		$.match({ userId }),
		$.project({
			name: 1,
			credits: 1,
			lifeQuality: {
				$round: [{ $avg: '$dayRates.value' }, 1]
			}
		}),
		$.unwind('credits'),
		$.match({ 'credits.groupId': localGroupId }),
		$.project({
			name: 1,
			lifeQuality: 1,
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
	let averageLifeQuality: number | null = null
	if (calcAverage) {
		averageLifeQuality = await getAverageLifeQuality(database, localGroupId)
		averageCredits = await getAverageCredits(database, localGroupId)
		state = getValueState(user.credits, averageCredits)
	}

	return { user, averageCredits, averageLifeQuality, state }
}

export { getUserProfile }
