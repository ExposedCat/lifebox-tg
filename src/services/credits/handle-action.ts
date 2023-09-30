import type { Database } from '../../types/index.js'
import {
	getMessageAction,
	getProfiles,
	getUserProfile,
	updateUserCredits
} from '../index.js'

async function handleAction(
	database: Database['users'],
	subject: string,
	groupId: number,
	changerId: number,
	targetId?: number,
	targetName?: string
) {
	let changerProfile
	let targetProfile
	if (targetId) {
		const profiles = await getProfiles(database, changerId, targetId, groupId)
		changerProfile = profiles.changer
		targetProfile = profiles.target
		if (!changerProfile || !targetProfile) {
			return
		}
	} else {
		const profile = await getUserProfile(database, changerId, groupId, false)
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
	await updateUserCredits(
		database,
		changerId,
		groupId,
		changer,
		undefined,
		false,
		target !== 0
	)
	if (target && targetId && targetName) {
		await updateUserCredits(database, targetId, groupId, target, targetName)
	}
}

export { handleAction }
