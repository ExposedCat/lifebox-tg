import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

import {
	createGroupIfNotExists,
	createUserIfNotExists
} from '../services/index.js'

const middleware = new Composer<CustomContext>()
middleware.chatType(['supergroup', 'group']).use(async (ctx, next) => {
	const { db } = ctx
	const groupId = ctx.chat.id
	await createGroupIfNotExists(db.groups, groupId)
	if (ctx.from) {
		await createUserIfNotExists(
			db.users,
			ctx.from.id,
			ctx.from.first_name,
			groupId
		)
	}
	const target = ctx.message?.reply_to_message?.from
	if (target) {
		await createUserIfNotExists(
			db.users,
			target.id,
			target.first_name,
			groupId
		)
	}
	await next()
})

export { middleware }
