import { Composer } from 'grammy'

import { getTopLifeUsers, getValueState } from '../services/index.js'
import type { CustomContext } from '../types/index.js'

const controller = new Composer<CustomContext>()
controller
	.chatType(['supergroup', 'group'])
	.command('life_quality', async ctx => {
		const groupId = ctx.chat.id
		const { list, average } = await getTopLifeUsers(ctx.db, groupId)
		if (!list.length) {
			await ctx.text('error.usersNotFound')
		} else {
			let userList = ''
			const label = ctx.i18n.t('partial.label.lifeQuality')
			for (let i = 0; i < list.length; ++i) {
				const user = list[i]
				const state = getValueState(user.lifeQuality, average)
				userList += ctx.i18n.t('partial.userLine', {
					name: user.name || process.env.UNNAMED,
					position: i + 1,
					value: user.lifeQuality,
					icon: ctx.i18n.t(`partial.icon.${state}`),
					label
				})
			}
			await ctx.text('fetch.rating', { userList, average, label })
		}
	})

export { controller }
