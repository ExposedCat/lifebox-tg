import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.ts'

// The Wrapped itself lives in the mini app, which reads the recap from the API.
const recapController = new Composer<CustomContext>()
recapController
	.chatType(['supergroup', 'group', 'private'])
	.command('wrapped', async ctx => {
		await ctx.text(
			'state.wrapped',
			{},
			{
				link_preview_options: {
					is_disabled: false,
					prefer_large_media: true,
					show_above_text: true
				}
			}
		)
	})

export { recapController }
