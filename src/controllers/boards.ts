import fs from 'node:fs/promises'
import { Composer, InputFile } from 'grammy'

import { generateBoardsChart } from '../services/charts.js'
import { getLifeQualityBoards } from '../services/index.js'
import type { CustomContext } from '../types/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).command('boards', async ctx => {
	const boards = await getLifeQualityBoards(ctx.db, ctx.chat.id)
	if (
		boards.happiest.length === 0 &&
		boards.saddest.length === 0 &&
		boards.idiots.length === 0
	) {
		await ctx.text('error.usersNotFound')
		return
	}

	const toChartEntries = (users: typeof boards.happiest) =>
		users.map(user => ({
			name: (user.name || process.env.UNNAMED).replace(/\s+/g, ' ').trim(),
			average: user.average
		}))
	const chartFile = await generateBoardsChart([
		{
			title: 'Happiest',
			accent: '#16a34a',
			entries: toChartEntries(boards.happiest)
		},
		{
			title: 'Saddest',
			accent: '#2563eb',
			entries: toChartEntries(boards.saddest)
		},
		{
			title: 'Idiots',
			accent: '#dc2626',
			entries: toChartEntries(boards.idiots)
		}
	])

	try {
		await ctx.replyWithPhoto(new InputFile(chartFile))
	} finally {
		await fs.rm(chartFile, { force: true })
	}
})

export { controller }
