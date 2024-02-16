import { Composer, InlineKeyboard, InputFile } from 'grammy'

import type { CustomContext } from '../types/index.js'
import { fetchUserRatesGraph } from '../services/database/user.graph.js'
import { createUserIfNotExists } from '../services/index.js'
import { generateChart } from '../services/charts.js'

const controller = new Composer<CustomContext>()
controller
	.chatType(['supergroup', 'group'])
	.callbackQuery(/compare(?:_\d+)+/, async ctx => {
		await createUserIfNotExists(
			ctx.db.users,
			ctx.callbackQuery.from.id,
			ctx.callbackQuery.from.first_name,
			ctx.chat.id
		)
		const targetUserIds = ctx.callbackQuery.data.split('_').slice(1).map(Number)
		if (targetUserIds.includes(ctx.callbackQuery.from.id)) {
			await ctx.answerCallbackQuery({
				text: ctx.i18n.t('error.cannotCompareSelf'),
				show_alert: true
			})
			return
		}
		const allUserIds = [...targetUserIds, ctx.callbackQuery.from.id]
		const { userDatasets, averagePoints } = await fetchUserRatesGraph({
			database: ctx.db.users,
			userIds: allUserIds,
			mode: 'halfYear'
		})
		const orderedDatasets = allUserIds.map(
			userId => userDatasets.find(dataset => dataset.userId === userId)!
		)
		const chartFile = await generateChart(orderedDatasets, averagePoints)
		await ctx.editMessageMedia(
			{
				type: 'photo',
				media: new InputFile(chartFile)
			},
			allUserIds.length <= 5
				? {
						reply_markup: new InlineKeyboard().text(
							ctx.i18n.t('button.compare'),
							`compare_${allUserIds.join('_')}`
						)
				  }
				: undefined
		)
	})

export { controller }
