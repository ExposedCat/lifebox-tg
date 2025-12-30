import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'

const explainRecapController = new Composer<CustomContext>()
explainRecapController
	.chatType(['supergroup', 'group'])
	.command('explain', async ctx => {
		await ctx.text('state.recap-2024-explanation')
	})

export { explainRecapController }
