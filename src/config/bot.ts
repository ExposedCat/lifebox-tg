import { Bot, CustomContext, Database } from '../types/index.js'
import { I18n } from '@grammyjs/i18n'

import { Bot as TelegramBot, session } from 'grammy'
import { apiThrottler } from '@grammyjs/transformer-throttler'

import { resolvePath } from '../helpers/index.js'

import { initLocaleEngine } from './index.js'
import * as handlers from '../controllers/index.js'
import { createReplyWithTextFunc, startSendPollJob } from '../services/index.js'

import * as middlewares from '../middlewares/index.js'

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

function setupControllers(bot: Bot, i18n: I18n) {
	bot.use(handlers.botAdded)
	bot.use(handlers.rateDate)
	bot.use(handlers.reactions)
	bot.use(handlers.sendPollForceController(i18n))
	bot.use(handlers.start)
	bot.use(handlers.profile)
	bot.use(handlers.history)
	bot.use(handlers.lifeQuality)
	bot.use(handlers.social)
	bot.use(handlers.groupTextMessage)
}

async function startBot(database: Database) {
	const localesPath = resolvePath(import.meta.url, '../locales')
	const i18n = initLocaleEngine(localesPath)
	const bot = new TelegramBot<CustomContext>(process.env.TOKEN)
	extendContext(bot, database)
	setupMiddlewares(bot, i18n)
	setupControllers(bot, i18n)
	bot.start()
	startSendPollJob(bot.api, i18n, database.groups)
}

export { startBot }
