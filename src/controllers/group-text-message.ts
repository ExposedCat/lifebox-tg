import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

import { getMessageAction } from '../helpers/index.js'
import { createGroupIfNotExists, updateUser } from '../services/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).on(':text', async ctx => {
	// Create entities if not exist
	await createGroupIfNotExists(ctx.db.groups, ctx.chat.id)
	const increase = ((Math.random() * 100) % 10 | 0) === 1
	await updateUser(ctx.db.users, ctx.from.id, ctx.chat.id, Number(increase))

	// Update target if exists
	const replyAuthor = ctx.message.reply_to_message?.from
	if (replyAuthor && replyAuthor.id !== ctx.from.id && !replyAuthor.is_bot) {
		const messageAction = await getMessageAction(ctx.message.text)
		await updateUser(
			ctx.db.users,
			replyAuthor.id,
			ctx.chat.id,
			messageAction
		)
	}
})

export { controller }
