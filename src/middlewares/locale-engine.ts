import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'
import type { I18n } from '@grammyjs/i18n/dist/source/i18n.js'

function middleware(localeEngine: I18n) {
	const middleware = new Composer<CustomContext>()
	middleware.use(async (ctx, next) => {
		if (ctx.chat) {
			return localeEngine.middleware()(ctx, next)
		} else {
			return await next()
		}
	})
	return middleware
}

export { middleware }
