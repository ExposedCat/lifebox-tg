import { Composer, InlineKeyboard, InputFile } from 'grammy'

import { generateChart } from '../services/charts.ts'
import { fetchUserRatesGraph } from '../services/index.ts'
import type { CustomContext } from '../types/index.ts'

/** Callback data is capped at 64 bytes, which fits six user IDs. */
const MAX_COMPARED_USERS = 5

const controller = new Composer<CustomContext>()
controller
	.chatType(['supergroup', 'group'])
	.callbackQuery(/^compare(?:_\d+)+$/, async ctx => {
		const userId = ctx.callbackQuery.from.id
		const targetUserIds = ctx.callbackQuery.data.split('_').slice(1).map(Number)
		if (targetUserIds.includes(userId)) {
			await ctx.answerCallbackQuery({
				text: ctx.i18n.t('error.cannotCompareSelf'),
				show_alert: true
			})
			return
		}
		const allUserIds = [...targetUserIds, userId]
		const { userDatasets, averagePoints } = await fetchUserRatesGraph({
			database: ctx.db,
			userIds: allUserIds,
			mode: 'halfYear'
		})
		const orderedDatasets = allUserIds.flatMap(id =>
			userDatasets.filter(dataset => dataset.userId === id)
		)
		const chart = await generateChart(orderedDatasets, averagePoints)
		await ctx.editMessageMedia(
			{ type: 'photo', media: new InputFile(chart, 'history.png') },
			allUserIds.length <= MAX_COMPARED_USERS
				? {
						reply_markup: new InlineKeyboard().text(
							ctx.i18n.t('button.compare'),
							`compare_${allUserIds.join('_')}`
						)
					}
				: undefined
		)
		await ctx.answerCallbackQuery()
	})

export { controller }
