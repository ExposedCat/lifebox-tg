import { CustomContext } from '../types/index.js'

import { Composer, InputFile } from 'grammy'

import { fetchUserRatesGraph } from '../services/database/get-user-graph.js'
import { createUserIfNotExists } from '../services/index.js'
import { generateChart } from '../services/charts.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).command('history', async ctx => {
	if (!ctx.from) {
		return
	}
	await createUserIfNotExists(
		ctx.db.users,
		ctx.from.id,
		ctx.from.first_name,
		ctx.chat.id
	)
	const { userPoints, averagePoints } = await fetchUserRatesGraph(
		ctx.db.users,
		ctx.from.id,
		'halfYear'
	)
	const chartFile = await generateChart(userPoints, averagePoints)
	await ctx.replyWithPhoto(new InputFile(chartFile))
})

export { controller }
