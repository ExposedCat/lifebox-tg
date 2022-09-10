import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

import {
	createGroupIfNotExists,
	updateUser,
	getMessageAction,
	increaseCredits
} from '../services/index.js'
import { getRandomIntByChance } from '../helpers/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).on(':text', async ctx => {
	const changerId = ctx.from.id
	const groupId = ctx.chat.id
	const userDb = ctx.db.users

	// Create entities if not exist
	await createGroupIfNotExists(ctx.db.groups, groupId)
	const balanceChange = getRandomIntByChance(
		Number(process.env.FREE_CREDITS_CHANCE),
		Number(process.env.FREE_CREDITS_MIN),
		Number(process.env.FREE_CREDITS_MAX)
	)
	await updateUser(userDb, changerId, groupId, balanceChange)

	// Update target if exists
	const replyAuthor = ctx.message.reply_to_message?.from
	if (replyAuthor && replyAuthor.id !== changerId && !replyAuthor.is_bot) {
		const { changer: changerAction, target: targetAction } =
			await getMessageAction(ctx.message.text)

		const increaser = increaseCredits.bind(null, userDb, changerId)
		if (changerAction) {
			await increaser(changerId, groupId, changerAction)
		}
		if (targetAction) {
			await increaser(replyAuthor.id, groupId, targetAction)
		}
	}
})

export { controller }
