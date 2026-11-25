import { Composer, GrammyError } from 'grammy'
import type { InputRichMessage } from 'grammy/types'

import { getGroup } from '../services/database/group.crud.js'
import { updateGroupCustomPollsSetting } from '../services/database/group.settings/custom-polls.js'
import { updateGroupDailyPollsSetting } from '../services/database/group.settings/daily-polls.js'
import { updateGroupTagUsersSetting } from '../services/database/group.settings/tag-users.js'
import type { CustomContext, Database, Group } from '../types/index.js'

type SettingOption = {
	commandId: string
	labelKey: string
	adminOnly?: boolean
	isEnabled: (group: Group, userId: number) => boolean
	set: (
		db: Database,
		group: Group,
		enabled: boolean,
		userId: number
	) => Promise<void>
}

const OPTIONS: SettingOption[] = [
	{
		commandId: 'dp',
		labelKey: 'settings.option.dailyPolls',
		adminOnly: true,
		isEnabled: group => group.settings.receiveDailyPolls,
		set: updateGroupDailyPollsSetting
	},
	{
		commandId: 'cp',
		labelKey: 'settings.option.customPolls',
		adminOnly: true,
		isEnabled: group => group.settings.receiveCustomPolls,
		set: updateGroupCustomPollsSetting
	},
	{
		commandId: 'rem',
		labelKey: 'settings.option.reminder',
		isEnabled: (group, userId) =>
			group.settings.tagUsers.some(user => user.userId === userId),
		set: (db, group, enabled, userId) =>
			updateGroupTagUsersSetting(db, group, userId, enabled)
	}
]

const OPTION_BY_COMMAND_ID = new Map(
	OPTIONS.map(option => [option.commandId, option])
)

function canChangeSetting(option: SettingOption, userId: number) {
	return !option.adminOnly || String(userId) === process.env.ADMIN_ID
}

function escapeHtml(text: string) {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
}

function settingsMessage(
	ctx: CustomContext,
	group: Group,
	userId: number
): InputRichMessage {
	const options = OPTIONS.filter(option => canChangeSetting(option, userId))
		.map(option => {
			const enabled = option.isEnabled(group, userId)
			const style = enabled ? 'success' : 'danger'
			const nextState = enabled ? 'off' : 'on'
			const label = escapeHtml(ctx.i18n.t(option.labelKey))
			const status = escapeHtml(
				ctx.i18n.t(enabled ? 'settings.enabled' : 'settings.disabled')
			)
			return `<p>${label} <tg-button type="callback_data" style="${style}" data="settings:${option.commandId}:${nextState}:${userId}">${status}</tg-button></p>`
		})
		.join('\n')

	return {
		html: `<h2>${escapeHtml(ctx.i18n.t('settings.title'))}</h2>\n${options}`,
		skip_entity_detection: true
	}
}

function settingsReplyExtra(ctx: CustomContext, userId: number) {
	const ephemeralId = ctx.message?.ephemeral_message_id
	return {
		ephemeral_message_parameters: { receiver_user_id: userId },
		...(ephemeralId !== undefined && {
			reply_parameters: { ephemeral_message_id: ephemeralId }
		})
	}
}

async function replySettings(ctx: CustomContext, group: Group, userId: number) {
	const message = settingsMessage(ctx, group, userId)
	try {
		await ctx.replyWithRichMessage(message, settingsReplyExtra(ctx, userId))
	} catch (error) {
		// Regular commands may arrive without an ephemeral reply target in groups.
		if (
			ctx.message?.ephemeral_message_id !== undefined ||
			!(error instanceof GrammyError) ||
			(error.error_code !== 400 && error.error_code !== 403)
		) {
			throw error
		}
		await ctx.replyWithRichMessage(message)
	}
}

export const settingsController = new Composer<CustomContext>()
const groupCommands = settingsController.chatType(['group', 'supergroup'])

groupCommands.command('settings', async ctx => {
	if (!ctx.from) return

	const group = await getGroup(ctx.db, ctx.chat.id)
	if (!group) {
		await ctx.text(
			'error.chatNotFound',
			{},
			ctx.message.ephemeral_message_id === undefined
				? {}
				: settingsReplyExtra(ctx, ctx.from.id)
		)
		return
	}

	await replySettings(ctx, group, ctx.from.id)
})

settingsController.callbackQuery(/^settings:/, async ctx => {
	const match = /^settings:([a-z0-9]+):(on|off):([1-9]\d*)$/.exec(
		ctx.callbackQuery.data
	)
	const option = match && OPTION_BY_COMMAND_ID.get(match[1])
	const userId = ctx.from.id
	const chat = ctx.chat
	const message = ctx.callbackQuery.message
	if (!chat) {
		await ctx.answerCallbackQuery()
		return
	}

	async function alert(key: string, data?: { option: string }) {
		await ctx.answerCallbackQuery({
			text: ctx.i18n.t(key, data),
			show_alert: true
		})
	}

	if (
		!match ||
		!option ||
		!message ||
		message.date === 0 ||
		(chat.type !== 'group' && chat.type !== 'supergroup')
	) {
		await alert('settings.invalidButton')
		return
	}
	if (match[3] !== String(userId)) {
		await alert('settings.ownMenu')
		return
	}
	if (!canChangeSetting(option, userId)) {
		await alert('settings.optionAdminOnly', {
			option: ctx.i18n.t(option.labelKey)
		})
		return
	}

	let saved = false
	try {
		const group = await getGroup(ctx.db, chat.id)
		if (!group) {
			await alert('error.chatNotFound')
			return
		}

		await option.set(ctx.db, group, match[2] === 'on', userId)
		saved = true
		const updated = await getGroup(ctx.db, chat.id)
		if (!updated) {
			await alert('settings.refreshFailed')
			return
		}

		const richMessage = settingsMessage(ctx, updated, userId)
		if (message.ephemeral_message_id !== undefined) {
			await ctx.editEphemeralMessageText(richMessage)
		} else {
			await ctx.editMessageText(richMessage)
		}
	} catch (error) {
		if (
			!(
				saved &&
				error instanceof GrammyError &&
				error.description.includes('message is not modified')
			)
		) {
			console.error('Bot | Failed to update settings:', error)
			await alert(saved ? 'settings.refreshFailed' : 'settings.saveFailed')
			return
		}
	}
	await ctx.answerCallbackQuery()
})

for (const option of OPTIONS) {
	for (const state of ['on', 'off']) {
		groupCommands.command(`set_${option.commandId}_${state}`, async ctx => {
			if (!ctx.from) return
			const userId = ctx.from.id
			const extra =
				ctx.message.ephemeral_message_id === undefined
					? {}
					: settingsReplyExtra(ctx, userId)

			if (!canChangeSetting(option, userId)) {
				await ctx.text(
					'settings.optionAdminOnly',
					{ option: ctx.i18n.t(option.labelKey) },
					extra
				)
				return
			}

			const group = await getGroup(ctx.db, ctx.chat.id)
			if (!group) {
				await ctx.text('error.chatNotFound', {}, extra)
				return
			}

			try {
				await option.set(ctx.db, group, state === 'on', userId)
			} catch (error) {
				console.error('Bot | Failed to save settings:', error)
				await ctx.text('settings.saveFailed', {}, extra)
				return
			}

			const updated = await getGroup(ctx.db, ctx.chat.id)
			if (updated) {
				await replySettings(ctx, updated, userId)
			} else {
				await ctx.text('settings.refreshFailed', {}, extra)
			}
		})
	}
}
