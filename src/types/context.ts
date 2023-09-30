import type { Extra, Database } from './index.js'
import type { Context, SessionFlavor } from 'grammy'
import type { I18nContextFlavor, TemplateData } from '@grammyjs/i18n'

interface Custom<C extends Context> {
	text: (
		text: string,
		templateData?: TemplateData,
		extra?: Extra
	) => ReturnType<C['reply']>
	db: Database
}

type CustomContextMethods = Custom<Context>

type CustomContext = Context &
	Custom<Context> &
	I18nContextFlavor &
	SessionFlavor<NonNullable<unknown>>

export { CustomContext, CustomContextMethods }
