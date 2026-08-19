import { Composer } from 'grammy'

import {
	createGroupIfNotExists,
	createUserIfNotExists
} from '../services/index.js'
import type { CustomContext } from '../types/index.js'

const middleware = new Composer<CustomContext>()
middleware
	.chatType(['supergroup', 'group', 'channel'])
	.use(async (ctx, next) => {
		const { db } = ctx
		const chatId = ctx.chat.id
		await createGroupIfNotExists(db, chatId, ctx.chat.type === 'channel')
		if (ctx.from) {
			await createUserIfNotExists(db, ctx.from.id, ctx.from.first_name, chatId)
		}
		await next()
	})

export { middleware }
