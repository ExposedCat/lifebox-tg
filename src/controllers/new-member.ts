import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'

const controller = new Composer<CustomContext>()
controller
	.chatType(['supergroup', 'group'])
	.on('msg:new_chat_members:me', async ctx => {
		await ctx.text('state.started', {
			username: ctx.from.username || ctx.from.first_name
		})
	})

export { controller }
