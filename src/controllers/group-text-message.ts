import type { CustomContext } from '../types/index.js'
import { Composer } from 'grammy'
import { handleAction } from '../services/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).on(':text', async ctx => {
	if (ctx.from.is_bot) {
		return
	}
	const userId = ctx.from.id
	const groupId = ctx.chat.id
	const { db } = ctx

	const target: { id?: number; name?: string } = {}
	if (ctx.message.reply_to_message) {
		const targetEntity = ctx.message.reply_to_message?.from
		if (targetEntity && targetEntity.id !== userId && !targetEntity.is_bot) {
			target.id = targetEntity.id
			target.name = targetEntity.first_name
		}
	}
	await handleAction(
		db.users,
		ctx.message.text,
		groupId,
		userId,
		target.id,
		target.name
	)
})

export { controller }
