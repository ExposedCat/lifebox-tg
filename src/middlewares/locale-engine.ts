import { CustomContext } from '../types/index.js'
import { I18n } from '@grammyjs/i18n/dist/source/i18n.js'

import { Composer } from 'grammy'

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
