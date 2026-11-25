import type { I18n } from '@grammyjs/i18n'
import { Composer } from 'grammy'

import { isAdmin } from '../config.ts'
import { getGroup } from '../services/index.ts'
import {
	populatePoll,
	sendDailyPoll,
	sendPoll
} from '../services/telegram/send-poll-job.ts'
import type { CustomContext } from '../types/index.ts'

function sendPollForceController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('force_resend', async ctx => {
			if (!isAdmin(ctx.from.id)) return
			await ctx.text('result.jobStarted')
			const { totalGroups, success } = await populatePoll(ctx.api, i18n, ctx.db)
			await ctx.text('result.resendDone', { total: totalGroups, success })
		})
	return controller
}

function sendPollHereForceController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('force_resend_here', async ctx => {
			if (!isAdmin(ctx.from.id)) return
			const group = await getGroup(ctx.db, ctx.chat.id)
			if (!group) {
				await ctx.text('error.chatNotFound')
				return
			}
			await ctx.text('result.jobStartedHere')
			const sent = await sendPoll(ctx.api, i18n, ctx.db, group)
			await ctx.text('result.resendDone', { total: 1, success: Number(sent) })
		})
	return controller
}

function sendTestDailyPollController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('test_daily', async ctx => {
			if (!isAdmin(ctx.from.id)) return
			await sendDailyPoll({ api: ctx.api, i18n, chatId: ctx.chat.id })
		})
	return controller
}

export {
	sendPollForceController,
	sendPollHereForceController,
	sendTestDailyPollController
}
