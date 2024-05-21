import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'
import {
	getGroup,
	updateGroupSettings
} from '../services/database/group.crud.js'

export const settingsController = new Composer<CustomContext>()
settingsController
	.chatType(['supergroup', 'group'])
	.command('settings', async ctx => {
		const group = await getGroup(ctx.db.groups, ctx.chat.id)
		if (!group) {
			await ctx.text('error.chatNotFound')
		} else {
			await ctx.text('state.groupSettings', {
				customPolls: ctx.i18n.t(
					`partial.boolean.${group.settings.receiveCustomPolls}`
				)
			})
		}
	})

export const toggleCustomPollsController = new Composer<CustomContext>()
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
			await ctx.text('result.settingChanged')
		}
	})
