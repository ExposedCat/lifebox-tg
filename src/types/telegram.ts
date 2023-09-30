import type { Api, Bot as TelegramBot, NextFunction } from 'grammy'
import type { CustomContext } from './index.js'

type Bot = TelegramBot<CustomContext>

type Handler = (ctx: CustomContext, next?: NextFunction) => void

type Extra = Parameters<Api['sendMessage']>[2]

export { Bot, Extra, Handler }
