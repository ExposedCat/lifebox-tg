import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'
import { getGroup } from '../services/database/group.crud.js'
import { getUserNames } from '../services/database/user.names.js'
import { updateGroupCustomPollsSetting } from '../services/database/group.settings/custom-polls.js'
import { updateGroupTagUsersSetting } from '../services/database/group.settings/tag-users.js'

export const settingsController = new Composer<CustomContext>()

settingsController
	.chatType(['supergroup', 'group'])
	.command('settings', async ctx => {
		const group = await getGroup(ctx.db.groups, ctx.chat.id)
		if (!group) {
			await ctx.text('error.chatNotFound')
		} else {
			const userNames = await getUserNames(
				ctx.db.users,
				group.settings.tagUsers.map(user => user.userId)
			)
			await ctx.text('state.groupSettings', {
				customPolls: ctx.i18n.t(
					`partial.boolean.${group.settings.receiveCustomPolls}`
				),
				tagUsers:
					group.settings.tagUsers.length !== 0
						? group.settings.tagUsers
								.map(user =>
									ctx.i18n.t('partial.fakeUserTag', {
										name: userNames[user.userId]
									})
								)
								.join(', ')
						: ctx.i18n.t('partial.boolean.false')
			})
		}
	})

settingsController
	.chatType(['supergroup', 'group'])
	.command('setting', async ctx => {
		const group = await getGroup(ctx.db.groups, ctx.chat.id)
		const [id, rawValue] = ctx.match.split(' ')
		if (!id || !rawValue) {
			await ctx.text('error.format.setting')
		} else {
			if (rawValue !== 'on' && rawValue !== 'off') {
				await ctx.text('error.format.settingValue')
			}
		}
		const value = rawValue === 'on'
		if (!group) {
			await ctx.text('error.chatNotFound')
		} else {
			if (id === 'custom_polls') {
				if (ctx.from.id !== Number(process.env.ADMIN_ID)) {
					await ctx.text('error.noRightsForCustomPoll')
					return
				}
				await updateGroupCustomPollsSetting(ctx.db.groups, group, value)
			} else if (id === 'reminder') {
				await updateGroupTagUsersSetting(
					ctx.db.groups,
					group,
					ctx.from.id,
					value
				)
			} else {
				await ctx.text('error.format.settingID')
				return
			}
			await ctx.text('result.settingChanged', {
				newValue: ctx.i18n.t(`partial.enabled.${value}`)
			})
		}
	})
