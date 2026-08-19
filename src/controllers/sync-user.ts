import { Composer } from 'grammy'

import { createUserIfNotExists } from '../services/index.js'
import type { CustomContext } from '../types/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).command('sync', async ctx => {
	if (ctx.from.id !== Number(process.env.ADMIN_ID)) {
		return
	}

	const target = ctx.message.reply_to_message?.from
	if (!target) {
		await ctx.reply('Reply to a user message with /sync.')
		return
	}

	await createUserIfNotExists(ctx.db, target.id, target.first_name, ctx.chat.id)
	await ctx.reply(`Synced ${target.first_name}.`)
})

export { controller }
