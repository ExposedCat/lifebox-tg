import type { I18n } from '@grammyjs/i18n'
import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.ts'

// The i18n middleware keeps the language in the chat session, which needs a
// chat to key on; chatless updates (poll answers) skip it.
function middleware(localeEngine: I18n) {
	const i18n = localeEngine.middleware()
	const middleware = new Composer<CustomContext>()
	middleware.use((ctx, next) => (ctx.chat ? i18n(ctx, next) : next()))
	return middleware
}

export { middleware }
