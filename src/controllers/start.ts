import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'

const controller = new Composer<CustomContext>()
controller.command('start', async ctx => {
	await ctx.text('state.started', {
		username: ctx.from?.username
	})
})

export { controller }
