import type { Api, Bot as TelegramBot } from 'grammy'

import type { CustomContext } from './index.ts'

type Bot = TelegramBot<CustomContext>

type Extra = Parameters<Api['sendMessage']>[2]

export type { Bot, Extra }
