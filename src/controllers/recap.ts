import fs from 'fs'
import { Composer, InputFile } from 'grammy'

import type { CustomContext } from '../types/index.js'
import { getUserRecap } from '../services/statistics/recap.js'
import { drawLabels } from '../services/images.js'

const recapController = new Composer<CustomContext>()
recapController
	.chatType(['supergroup', 'group'])
	.command('recap', async ctx => {
		const recap = await getUserRecap(ctx.db.users, ctx.from.id, 2023)

		const daysOffset = recap.days < 10 ? 37 : recap.days < 100 ? 21 : 0
		const averageOffset = recap.average < 0 ? -20 : 0

		const happiestMonthLabel = `${recap.happiestMonth.name} (${recap.happiestMonth.value})`
		const worstMonthLabel = `${recap.worstMonth.name} (${recap.worstMonth.value})`

		// TODO: Move to service
		const output = `/tmp/recap2023-${ctx.from.id}.png`
		const hint = await ctx.text('result.waitRecap')
		if (!fs.existsSync(output)) {
			await drawLabels({
				image: './src/assets/recap-2023.png',
				output,
				labels: [
					{
						x: 1327 + daysOffset,
						y: 463,
						text: recap.days.toString(),
						anchor: 'right'
					},
					{
						x: 1260 + averageOffset,
						y: 725,
						text: recap.average.toFixed(2),
						anchor: 'right'
					},
					{ x: 1320, y: 1048, text: `${recap.happierBy}%`, anchor: 'right' },
					{
						x: 754,
						y: 671,
						text: happiestMonthLabel,
						fontSize: 48,
						anchor: 'right'
					},
					{ x: 549, y: 912, text: worstMonthLabel, fontSize: 48 },
					{ x: 416, y: 1143, text: recap.maxPositiveLength.toString() },
					{ x: 606, y: 1143, text: recap.maxNegativeLength.toString() },
					{ x: 800, y: 1143, text: recap.maxStraightLength.toString() }
				]
			})
		}
		await ctx.replyWithPhoto(new InputFile(output), { caption: '/explain' })
		try {
			await ctx.api.deleteMessage(ctx.chat.id, hint.message_id)
		} catch {
			// Ignore
		}
	})

export { recapController }
