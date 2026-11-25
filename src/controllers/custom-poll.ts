import type { I18n } from '@grammyjs/i18n'
import { Composer } from 'grammy'

import { APP_ENV, isAdmin } from '../config.ts'
import { fetchGroups } from '../services/index.ts'
import { proxyPoll } from '../services/telegram/proxy-poll.ts'
import { resendPoll } from '../services/telegram/send-poll-job.ts'
import type { CustomContext } from '../types/index.ts'

function sendCustomPollController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('custom_poll', async ctx => {
			if (!ctx.message.reply_to_message?.poll) {
				await ctx.text('error.invalidCustomPoll')
				return
			}
			if (!isAdmin(ctx.from.id)) {
				await ctx.text('error.noRightsForCustomPoll')
				return
			}

			const publicPollChatId = APP_ENV.PUBLIC_POLLS_CHAT_ID

			const result = await proxyPoll({
				api: ctx.api,
				fromChatId: ctx.chat.id,
				toChatId: publicPollChatId,
				messageId: ctx.message.reply_to_message.message_id
			})
			if (!result.messageId) {
				await ctx.text('error.failedToProxyPoll', {
					error: result.error ?? 'Unknown error (logged)'
				})
				return
			}

			const groups = await fetchGroups(ctx.db)
			const targets = groups.filter(group => group.settings.receiveCustomPolls)
			let success = 0
			for (const group of targets) {
				try {
					await resendPoll({
						database: ctx.db,
						group,
						api: ctx.api,
						i18n,
						messageId: result.messageId,
						firstGroupId: publicPollChatId
					})
					success += 1
				} catch (error) {
					console.warn(`Bot | Custom poll failed for ${group.groupId}:`, error)
				}
			}
			await ctx.text('result.customPoll', {
				total: targets.length,
				success,
				globalTotal: groups.length
			})
		})
	return controller
}

export { sendCustomPollController }
