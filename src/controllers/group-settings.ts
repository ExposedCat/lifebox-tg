import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'
import {
	getGroup,
	updateGroup,
	updateGroupSettings
} from '../services/database/group.crud.js'
import { getUserNames } from '../services/database/user.names.js'

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
				tagUsers: group.settings.tagUsers
					.map(user =>
						ctx.i18n.t('partial.fakeUserTag', { name: userNames[user.userId] })
					)
					.join(', ')
			})
		}
	})

settingsController
	.chatType(['supergroup', 'group'])
	.command('toggle_custom', async ctx => {
		const group = await getGroup(ctx.db.groups, ctx.chat.id)
		if (!group) {
			await ctx.text('error.chatNotFound')
		} else {
			if (ctx.from.id !== Number(process.env.ADMIN_ID)) {
				await ctx.text('error.noRightsForCustomPoll')
				return
			}
			await updateGroupSettings(ctx.db.groups, group, {
				receiveCustomPolls: !group.settings.receiveCustomPolls
			})
			await ctx.text('result.settingChanged', {
				newValue: !group.settings.receiveCustomPolls
			})
		}
	})

settingsController
	.chatType(['supergroup', 'group'])
	.command('toggle_reminder', async ctx => {
		const userId = ctx.from.id

		const group = await getGroup(ctx.db.groups, ctx.chat.id)
		if (!group) {
			await ctx.text('error.chatNotFound')
			return
		}

		await updateGroup(ctx.db.groups, group, [
			{
				$set: {
					'settings.tagUsers': {
						$cond: {
							if: { $in: [{ userId }, '$settings.tagUsers'] },
							then: {
								$filter: {
									input: '$settings.tagUsers',
									cond: { $ne: ['$$this.userId', userId] }
								}
							},
							else: {
								$concatArrays: ['$settings.tagUsers', [{ userId }]]
							}
						}
					}
				}
			}
		])
		await ctx.text('result.settingChanged')
	})
