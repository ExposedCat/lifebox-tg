import type { I18nContextFlavor, TemplateData } from '@grammyjs/i18n'
import type { Context, SessionFlavor } from 'grammy'

import type { Database, Extra } from './index.ts'

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

export type { CustomContext, CustomContextMethods }
