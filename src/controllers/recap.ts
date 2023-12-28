import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'
import { getUserRecap } from '../services/statistics/recap.js'

const recapController = new Composer<CustomContext>()
recapController
	.chatType(['supergroup', 'group'])
	.command('recap', async ctx => {
		const recap = await getUserRecap(ctx.db.users, ctx.from.id, 2023)
		await ctx.text('debug.json', {
			json: JSON.stringify(recap)
		})
	})

export { recapController }
