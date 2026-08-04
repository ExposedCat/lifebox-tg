import { Composer } from 'grammy'

import type { I18n } from '@grammyjs/i18n/dist/source/i18n.js'
import { getGroup } from '../services/database/group.crud.js'
import {
	populatePoll,
	sendDailyPoll,
	sendPoll
} from '../services/telegram/send-poll-job.js'
import type { CustomContext } from '../types/index.js'

function sendPollForceController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('force_resend', async ctx => {
			if (ctx.from.id === Number(process.env.ADMIN_ID)) {
				await ctx.text('result.jobStarted')
				const { totalGroups, success } = await populatePoll(
					ctx.api,
					i18n,
					ctx.db
				)
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
				const group = await getGroup(ctx.db, ctx.chat.id)
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

function sendTestDailyPollController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('test_daily', async ctx => {
			if (ctx.from.id === Number(process.env.ADMIN_ID)) {
				await sendDailyPoll({ api: ctx.api, i18n, chatId: ctx.chat.id })
			}
		})
	return controller
}

export {
	sendPollForceController,
	sendPollHereForceController,
	sendTestDailyPollController
}
