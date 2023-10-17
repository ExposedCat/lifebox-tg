import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'
import {
	createGroupIfNotExists,
	createUserIfNotExists
} from '../services/index.js'

const middleware = new Composer<CustomContext>()
middleware
	.chatType(['supergroup', 'group', 'channel'])
	.use(async (ctx, next) => {
		const { db } = ctx
		const chatId = ctx.chat.id
		await createGroupIfNotExists(db.groups, chatId, ctx.chat.type === 'channel')
		if (ctx.from) {
			await createUserIfNotExists(
				db.users,
				ctx.from.id,
				ctx.from.first_name,
				chatId
			)
		}
		const target = ctx.message?.reply_to_message?.from
		if (target) {
			await createUserIfNotExists(
				db.users,
				target.id,
				target.first_name,
				chatId
			)
		}
		await next()
	})

export { middleware }
