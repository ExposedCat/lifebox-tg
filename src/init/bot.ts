import type { I18n } from '@grammyjs/i18n'
import { Bot as TelegramBot, session } from 'grammy'
import { apiThrottler } from '@grammyjs/transformer-throttler'
import type { BotCommand } from 'grammy/types'

import type { Bot, CustomContext, Database } from '../types/index.js'
import { resolvePath } from '../helpers/index.js'
import { initLocaleEngine } from './index.js'
import * as handlers from '../controllers/index.js'
import { createReplyWithTextFunc, startSendPollJob } from '../services/index.js'
import * as middlewares from '../middlewares/index.js'

const PRIVATE_COMMANDS: BotCommand[] = [
	{ command: 'start', description: 'Start the bot' },
	{ command: 'wrapped', description: 'Open your yearly Wrapped' }
]

const GROUP_COMMANDS: BotCommand[] = [
	{ command: 'start', description: 'Start the bot' },
	{ command: 'profile', description: 'Show your profile' },
	{ command: 'history', description: 'Show your rating history' },
	{
		command: 'life_quality',
		description: 'Show the group life quality rating'
	},
	{ command: 'settings', description: "Configure this group's settings" },
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
	bot.catch(error => console.error(`Bot | ${error.message}`))
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
	bot.use(handlers.sendCustomPollController(i18n))
	bot.use(handlers.start)
	bot.use(handlers.profile)
	bot.use(handlers.history)
	bot.use(handlers.lifeQuality)
	bot.use(handlers.recapController)
	bot.use(handlers.explainRecapController)
	bot.use(handlers.groupSettings)
}

async function startBot(database: Database) {
	const localesPath = resolvePath(import.meta.url, '../locales')
	const i18n = initLocaleEngine(localesPath)
	const bot = new TelegramBot<CustomContext>(process.env.TOKEN)
	extendContext(bot, database)
	setupMiddlewares(bot, i18n)
	setupControllers(bot, i18n)
	await setupCommands(bot)
	bot.start()
	startSendPollJob(bot.api, i18n, database)
	return bot
}

export { startBot }
