import type { CustomContext } from '../types/index.js'
import { Composer, InputFile } from 'grammy'
import { fetchUserRatesGraph } from '../services/database/get-user-graph.js'
import { createUserIfNotExists } from '../services/index.js'
import { generateChart } from '../services/charts.js'

const controller = new Composer<CustomContext>()
controller
	.chatType(['supergroup', 'group'])
	.callbackQuery(/compare_(\d+)/, async ctx => {
		await createUserIfNotExists(
			ctx.db.users,
			ctx.callbackQuery.from.id,
			ctx.callbackQuery.from.first_name,
			ctx.chat.id
		)
		const targetUserId = Number(ctx.match[1])
		if (targetUserId === ctx.callbackQuery.from.id) {
			await ctx.answerCallbackQuery({
				text: ctx.i18n.t('error.cannotCompareSelf'),
				show_alert: true
			})
			return
		}
		const { userDatasets, averagePoints } = await fetchUserRatesGraph({
			database: ctx.db.users,
			userIds: [targetUserId, ctx.callbackQuery.from.id],
			mode: 'halfYear'
		})
		const chartFile = await generateChart(userDatasets, averagePoints)
		await ctx.editMessageMedia({
			type: 'photo',
			media: new InputFile(chartFile)
		})
	})

export { controller }
