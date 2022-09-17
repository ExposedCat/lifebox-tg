import { Collection } from 'mongodb'

import {
	getMessageAction,
	getProfiles,
	getUserProfile,
	updateUserCredits
} from '../index.js'

async function handleAction(
	userDb: Collection,
	subject: string,
	groupId: number,
	changerId: number,
	targetId?: number,
	targetName?: string
) {
	let changerProfile
	let targetProfile
	if (targetId) {
		const credits = await getProfiles(userDb, changerId, targetId, groupId)
		changerProfile = credits.changer
		targetProfile = credits.target
	} else {
		const profile = await getUserProfile(userDb, changerId, groupId, false)
		if (!profile) {
			return
		}
		changerProfile = profile.user.credits
	}
	const { changer, target } = await getMessageAction(
		subject,
		changerProfile,
		targetProfile
	)
	if (changer) {
		await updateUserCredits(userDb, changerId, groupId, changer)
	}
	if (target && targetId && targetName) {
		await updateUserCredits(userDb, targetId, groupId, target, targetName)
	}
}

export { handleAction }
