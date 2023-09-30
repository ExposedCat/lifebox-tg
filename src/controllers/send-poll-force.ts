import { I18n } from '@grammyjs/i18n/dist/source/i18n.js'
import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

import { populatePoll, sendPoll } from '../services/telegram/send-poll-job.js'

function sendPollForceController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('force_resend', async ctx => {
			if (ctx.from.id === Number(process.env.ADMIN_ID)) {
				await ctx.text('result.jobStarted')
				const { totalGroups, success } = await populatePoll(ctx.api, i18n, ctx.db)
				await ctx.text('result.resendDone', { total: totalGroups, success })
			}
		})
	return controller
}

function sendPollHereForceController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('force_resend_here', async ctx => {
			if (ctx.from.id === Number(process.env.ADMIN_ID)) {
				const group = await ctx.db.groups.findOne({ groupId: ctx.chat.id })
				if (!group) {
					await ctx.text('error.chatNotFound')
					return
				}
				await ctx.text('result.jobStartedHere')
				await sendPoll(ctx.api, i18n, ctx.db, group)
				await ctx.text('result.resendDone')
			}
		})
	return controller
}

export { sendPollForceController, sendPollHereForceController }
