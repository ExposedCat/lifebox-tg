import { Composer } from 'grammy'
import type { I18n } from '@grammyjs/i18n'

import { fetchGroups } from '../services/index.js'
import { resendPoll } from '../services/telegram/send-poll-job.js'
import type { CustomContext } from '../types/index.js'
import { proxyPoll } from '../services/telegram/proxy-poll.js'

function sendCustomPollController(i18n: I18n) {
	const controller = new Composer<CustomContext>()
	controller
		.chatType(['supergroup', 'group'])
		.command('custom_poll', async ctx => {
			if (!ctx.from) {
				return
			}
			if (!ctx.message.reply_to_message?.poll) {
				await ctx.text('error.invalidCustomPoll')
				return
			}
			if (ctx.from.id !== Number(process.env.ADMIN_ID)) {
				await ctx.text('error.noRightsForCustomPoll')
				return
			}

			const publicPollChatId = Number(process.env.PUBLIC_POLLS_CHAT_ID)

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

			const groups = fetchGroups(ctx.db.groups)
			let totalGroups = 0
			let globalTotalGroups = 0
			let success = 0
			while (await groups.hasNext()) {
				const group = await groups.next()
				if (!group) {
					break
				}
				globalTotalGroups += 1
				if (!group.settings.receiveCustomPolls) {
					continue
				}
				totalGroups += 1
				try {
					await resendPoll({
						group,
						api: ctx.api,
						i18n,
						messageId: result.messageId,
						firstGroupId: publicPollChatId
					})
				} catch {
					// Ignore
				}
				success += 1
			}
			await ctx.text('result.customPoll', {
				total: totalGroups,
				success,
				globalTotal: globalTotalGroups
			})
		})
	return controller
}

export { sendCustomPollController }
