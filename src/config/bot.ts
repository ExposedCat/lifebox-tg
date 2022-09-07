import { Bot, CustomContext, Database } from '../types/index.js'
import { I18n } from '@grammyjs/i18n'

import { Bot as TelegramBot, session } from 'grammy'

import { resolvePath } from '../helpers/index.js'

import { initLocaleEngine } from './index.js'
import * as handlers from '../controllers/index.js'
import { createReplyWithTextFunc, startSendPollJob } from '../services/index.js'

function extendContext(bot: Bot, database: Database) {
	bot.use(async (ctx, next) => {
		ctx.text = createReplyWithTextFunc(ctx)
		ctx.db = database
		await next()
	})
}

function setupMiddlewares(bot: Bot, localeEngine: I18n) {
	bot.use(session())
	bot.use(async (ctx, next) => {
		if ('chat' in ctx) {
			return localeEngine.middleware()(ctx, next)
		} else {
			return await next()
		}
	})
	bot.catch(error => console.error(`Bot | ${error.message}`))
}

function setupControllers(bot: Bot) {
	bot.use(handlers.botAdded)
	bot.use(handlers.start)
	bot.use(handlers.profile)
	bot.use(handlers.groupTextMessage)
}

async function startBot(database: Database) {
	const localesPath = resolvePath(import.meta.url, '../locales')
	const i18n = initLocaleEngine(localesPath)
	const bot = new TelegramBot<CustomContext>(process.env.TOKEN)
	extendContext(bot, database)
	setupMiddlewares(bot, i18n)
	setupControllers(bot)
	bot.start()
	startSendPollJob(bot.api, i18n, database.groups)
}

export { startBot }
