import { Collection } from 'mongodb'
import { MessageAction } from '../../types/index.js'

import { getUserProfile, updateUser } from '../index.js'
import { getBalanceChange } from '../../helpers/index.js'

async function increaseCredits(
	userDb: Collection,
	changerId: number,
	targetId: number,
	groupId: number,
	action: MessageAction
) {
	const changer = await getUserProfile(userDb, changerId, groupId)
	const target = await getUserProfile(userDb, targetId, groupId)
	const change = getBalanceChange(changer.credits, target.credits, action)
	await updateUser(userDb, targetId, groupId, change)
}

export { increaseCredits }
