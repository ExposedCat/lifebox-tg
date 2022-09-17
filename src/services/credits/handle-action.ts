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
		const profiles = await getProfiles(userDb, changerId, targetId, groupId)
		changerProfile = profiles.changer
		targetProfile = profiles.target
		if (!changerProfile || !targetProfile) {
			return
		}
	} else {
		const profile = await getUserProfile(userDb, changerId, groupId, false)
		if (!profile) {
			return
		}
		changerProfile = profile.user
	}
	if (
		Date.now() - Number(changerProfile.lastRated) <
		Number(process.env.RATE_TIMEOUT_MS)
	) {
		return
	}
	const { changer, target } = await getMessageAction(
		subject,
		changerProfile,
		targetProfile
	)
	await updateUserCredits(userDb, changerId, groupId, changer)
	if (target && targetId && targetName) {
		await updateUserCredits(userDb, targetId, groupId, target, targetName)
	}
}

export { handleAction }
