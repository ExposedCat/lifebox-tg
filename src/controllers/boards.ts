import fs from 'node:fs/promises'
import { Composer, InputFile } from 'grammy'

import { generateBoardsChart } from '../services/charts.js'
import { getLifeQualityBoards } from '../services/index.js'
import type { CustomContext } from '../types/index.js'

async function sendBoards(ctx: CustomContext, groupId: number | null) {
	const boards = await getLifeQualityBoards(ctx.db, groupId)
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
			entries: toChartEntries(boards.happiest)
		},
		{
			title: 'Saddest',
			entries: toChartEntries(boards.saddest)
		},
		{
			title: 'Idiots',
			entries: toChartEntries(boards.idiots)
		}
	])

	try {
		await ctx.replyWithPhoto(new InputFile(chartFile))
	} finally {
		await fs.rm(chartFile, { force: true })
	}
}

const controller = new Composer<CustomContext>()
controller.command('global_boards', ctx => sendBoards(ctx, null))
controller
	.chatType(['supergroup', 'group'])
	.command('chat_boards', ctx => sendBoards(ctx, ctx.chat.id))

export { controller }
