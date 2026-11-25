import path from 'node:path'
import { I18n } from '@grammyjs/i18n'
import { apiThrottler } from '@grammyjs/transformer-throttler'
import { Bot as TelegramBot, session } from 'grammy'
import type { BotCommand } from 'grammy/types'

import { APP_ENV } from '../config.ts'
import * as handlers from '../controllers/index.ts'
import * as middlewares from '../middlewares/index.ts'
import { createReplyWithTextFunc, startSendPollJob } from '../services/index.ts'
import type { Bot, CustomContext, Database } from '../types/index.ts'

const PRIVATE_COMMANDS: BotCommand[] = [
	{ command: 'start', description: 'Start the bot' },
	{ command: 'global_boards', description: 'Show the global leaderboards' },
	{ command: 'wrapped', description: 'Open your yearly Wrapped' }
]

const GROUP_COMMANDS: BotCommand[] = [
	{ command: 'start', description: 'Start the bot' },
	{ command: 'profile', description: 'Show your profile' },
	{ command: 'history', description: 'Show your rating history' },
	{ command: 'chat_boards', description: "Show this chat's leaderboards" },
	{ command: 'global_boards', description: 'Show the global leaderboards' },
	{
		command: 'life_quality',
		description: 'Show the group life quality rating'
	},
	{
		command: 'settings',
		description: "Configure this group's settings",
		is_ephemeral: true
	},
	{ command: 'wrapped', description: 'Open your yearly Wrapped' },
	{ command: 'explain', description: 'Explain Wrapped metrics' }
]

function extendContext(bot: Bot, database: Database) {
	bot.use(async (ctx, next) => {
		ctx.text = createReplyWithTextFunc(ctx)
		ctx.db = database
		await next()
	})
}

function setupMiddlewares(bot: Bot, localeEngine: I18n) {
	bot.api.config.use(apiThrottler())

	bot.use(session())
	bot.use(middlewares.localeEngine(localeEngine))
	bot.use(middlewares.createEntities)
	bot.catch(({ error, ctx }) =>
		console.error(`Bot | Update ${ctx.update.update_id} failed:`, error)
	)
}

async function setupCommands(bot: Bot) {
	try {
		await Promise.all([
			bot.api.setMyCommands(PRIVATE_COMMANDS, {
				scope: { type: 'all_private_chats' }
			}),
			bot.api.setMyCommands(GROUP_COMMANDS, {
				scope: { type: 'all_group_chats' }
			})
		])
	} catch (error) {
		console.error('Bot | Failed to set commands:', error)
	}
}

function setupControllers(bot: Bot, i18n: I18n) {
	bot.use(handlers.compareGraphs)
	bot.use(handlers.botAdded)
	bot.use(handlers.rateDate)
	bot.use(handlers.sendPollForceController(i18n))
	bot.use(handlers.sendPollHereForceController(i18n))
	bot.use(handlers.sendTestDailyPollController(i18n))
	bot.use(handlers.sendCustomPollController(i18n))
	bot.use(handlers.start)
	bot.use(handlers.profile)
	bot.use(handlers.history)
	bot.use(handlers.boards)
	bot.use(handlers.syncUser)
	bot.use(handlers.lifeQuality)
	bot.use(handlers.recapController)
	bot.use(handlers.explainRecapController)
	bot.use(handlers.groupSettings)
}

async function startBot(database: Database) {
	const i18n = new I18n({
		directory: path.join(import.meta.dir, '../locales'),
		defaultLanguage: 'en',
		defaultLanguageOnMissing: true,
		useSession: true
	})
	const bot = new TelegramBot<CustomContext>(APP_ENV.TOKEN)
	extendContext(bot, database)
	setupMiddlewares(bot, i18n)
	setupControllers(bot, i18n)
	await bot.init()
	await setupCommands(bot)
	// Resolves only once polling stops; a rejection here is fatal.
	bot.start().catch(error => {
		console.error('Bot | Polling failed:', error)
		process.exit(3)
	})
	const pollJob = startSendPollJob(bot.api, i18n, database)
	return { bot, pollJob }
}

export { startBot }
