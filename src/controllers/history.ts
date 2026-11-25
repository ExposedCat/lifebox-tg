import { Composer, InlineKeyboard, InputFile } from 'grammy'

import { generateChart } from '../services/charts.ts'
import { fetchUserRatesGraph } from '../services/index.ts'
import type { CustomContext } from '../types/index.ts'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).command('history', async ctx => {
	const { userDatasets, averagePoints } = await fetchUserRatesGraph({
		database: ctx.db,
		userIds: [ctx.from.id],
		mode: 'halfYear'
	})
	const chart = await generateChart(userDatasets, averagePoints)
	await ctx.replyWithPhoto(new InputFile(chart, 'history.png'), {
		reply_markup: new InlineKeyboard().text(
			ctx.i18n.t('button.compare'),
			`compare_${ctx.from.id}`
		)
	})
})

export { controller }
