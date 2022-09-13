import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

import {
	createGroupIfNotExists,
	createUserIfNotExists,
	handleAction
} from '../services/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).on(':text', async ctx => {
	if (ctx.from.is_bot) {
		return
	}
	const userId = ctx.from.id
	const groupId = ctx.chat.id
	const { db } = ctx

	await createGroupIfNotExists(db.groups, groupId)
	await createUserIfNotExists(db.users, userId, ctx.from.first_name, groupId)

	let target: { id?: number; name?: string } = {}
	if (ctx.message.reply_to_message) {
		const targetEntity = ctx.message.reply_to_message?.from
		if (
			targetEntity &&
			targetEntity.id !== userId &&
			!targetEntity.is_bot
		) {
			target.id = targetEntity.id
			target.name = targetEntity.first_name
			await createUserIfNotExists(
				db.users,
				target.id,
				targetEntity.first_name,
				groupId
			)
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
