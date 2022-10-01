import { I18n } from '@grammyjs/i18n/dist/source/i18n.js'
import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

// TODO: Change import to the service
import { populatePoll } from '../services/telegram/send-poll-job.js'

function sendPollForceController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('force_resend', async ctx => {
			if (ctx.from.id === Number(process.env.ADMIN_ID)) {
				await ctx.reply('Job started…')
				await populatePoll(ctx.api, i18n, ctx.db.groups)
				await ctx.reply('Done')
			}
		})
	return controller
}

export { sendPollForceController }
