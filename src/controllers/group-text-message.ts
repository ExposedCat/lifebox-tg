import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

import {
	createGroupIfNotExists,
	updateUser,
	getMessageAction,
	getProfiles
} from '../services/index.js'
import { getRandomIntByChance } from '../helpers/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).on(':text', async ctx => {
	const changerId = ctx.from.id
	const changerName = ctx.from.first_name
	const groupId = ctx.chat.id
	const userDb = ctx.db.users

	// Create entities if not exist
	await createGroupIfNotExists(ctx.db.groups, groupId)
	const balanceChange = getRandomIntByChance(
		Number(process.env.FREE_CREDITS_CHANCE),
		Number(process.env.FREE_CREDITS_MIN),
		Number(process.env.FREE_CREDITS_MAX)
	)
	await updateUser(userDb, changerId, groupId, balanceChange, changerName)

	// Update user & target if the latter exists
	const replyAuthor = ctx.message.reply_to_message?.from
	if (replyAuthor && replyAuthor.id !== changerId && !replyAuthor.is_bot) {
		const credits = await getProfiles(
			userDb,
			changerId,
			replyAuthor.id,
			groupId
		)
		const { changer, target } = await getMessageAction(
			ctx.message.text,
			credits.changer,
			credits.target
		)
		if (changer) {
			await updateUser(userDb, changerId, groupId, changer)
		}
		if (target) {
			await updateUser(
				userDb,
				replyAuthor.id,
				groupId,
				target,
				replyAuthor.first_name
			)
		}
	}
})

export { controller }
