import { Collection } from 'mongodb'

import { AggregationBuilder as $ } from '../../helpers/index.js'
import { getAverageCredits } from '../index.js'

// TODO: Move to types file
enum CreditState {
	Low = 'lowCredits',
	Normal = 'normalCredits',
	High = 'highCredits'
}

async function getUserProfile(
	userDb: Collection,
	userId: number,
	localGroupId: number
) {
	const averageCredits = await getAverageCredits(userDb, localGroupId)
	const users = userDb.aggregate<{ credits: number }>([
		$.match({ userId }),
		$.unwind('$credits'),
		$.match({ 'credits.groupId': localGroupId }),
		$.project({ credits: '$credits.credits' })
	])

	const user = await users.next()
	const credits = user?.credits || 0
	let state = CreditState.Normal
	const lowPercent = Number(process.env.CREDITS_SMALL_PERCENT) / 100
	const lowLimit = averageCredits * lowPercent
	if (credits <= lowLimit) {
		state = CreditState.Low
	} else {
		const highPercent = Number(process.env.CREDITS_HIGH_PERCENT) / 100
		const highLimit = averageCredits * highPercent
		if (credits >= highLimit) {
			state = CreditState.High
		}
	}

	return { credits, averageCredits, state }
}

export { getUserProfile }
