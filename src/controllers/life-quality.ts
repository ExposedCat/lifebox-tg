import { Composer } from 'grammy'

import { APP_ENV } from '../config.ts'
import { getTopLifeUsers, getValueState } from '../services/index.ts'
import type { CustomContext } from '../types/index.ts'

const controller = new Composer<CustomContext>()
controller
	.chatType(['supergroup', 'group'])
	.command('life_quality', async ctx => {
		const { list, average } = await getTopLifeUsers(ctx.db, ctx.chat.id)
		if (!list.length) {
			await ctx.text('error.usersNotFound')
			return
		}
		const label = ctx.i18n.t('partial.label.lifeQuality')
		const userList = list
			.map((user, i) =>
				ctx.i18n.t('partial.userLine', {
					name: user.name || APP_ENV.UNNAMED,
					position: i + 1,
					value: user.lifeQuality,
					icon: ctx.i18n.t(
						`partial.icon.${getValueState(user.lifeQuality, average)}`
					),
					label
				})
			)
			.join('')
		await ctx.text('fetch.rating', { userList, average, label })
	})

export { controller }
