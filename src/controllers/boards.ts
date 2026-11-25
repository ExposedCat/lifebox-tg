import { Composer, InputFile } from 'grammy'

import { APP_ENV } from '../config.ts'
import { generateBoardsChart } from '../services/charts.ts'
import type { BoardUser } from '../services/database/user.graph.ts'
import { getLifeQualityBoards } from '../services/index.ts'
import type { CustomContext } from '../types/index.ts'

const toChartEntries = (users: BoardUser[]) =>
	users.map(user => ({
		name: (user.name || APP_ENV.UNNAMED).replace(/\s+/g, ' ').trim(),
		average: user.average
	}))

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

	const chart = await generateBoardsChart([
		{ title: 'Happiest', entries: toChartEntries(boards.happiest) },
		{ title: 'Saddest', entries: toChartEntries(boards.saddest) },
		{ title: 'Idiots', entries: toChartEntries(boards.idiots) }
	])
	await ctx.replyWithPhoto(new InputFile(chart, 'boards.png'))
}

const controller = new Composer<CustomContext>()
controller.command('global_boards', ctx => sendBoards(ctx, null))
controller
	.chatType(['supergroup', 'group'])
	.command('chat_boards', ctx => sendBoards(ctx, ctx.chat.id))

export { controller }
