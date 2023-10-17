import { Composer, InlineKeyboard, InputFile } from 'grammy'

import type { CustomContext } from '../types/index.js'
import { fetchUserRatesGraph } from '../services/database/user.graph.js'
import { createUserIfNotExists } from '../services/index.js'
import { generateChart } from '../services/charts.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).command('history', async ctx => {
	await createUserIfNotExists(
		ctx.db.users,
		ctx.from.id,
		ctx.from.first_name,
		ctx.chat.id
	)
	const { userDatasets, averagePoints } = await fetchUserRatesGraph({
		database: ctx.db.users,
		userIds: [ctx.from.id],
		mode: 'halfYear'
	})
	const chartFile = await generateChart(userDatasets, averagePoints)
	await ctx.replyWithPhoto(new InputFile(chartFile), {
		reply_markup: new InlineKeyboard().text(
			ctx.i18n.t('button.compare'),
			`compare_${ctx.from.id}`
		)
	})
})

export { controller }
