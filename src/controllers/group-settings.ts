import { Composer } from 'grammy'

import { getGroup } from '../services/database/group.crud.js'
import { updateGroupCustomPollsSetting } from '../services/database/group.settings/custom-polls.js'
import { updateGroupTagUsersSetting } from '../services/database/group.settings/tag-users.js'
import type { CustomContext, Group } from '../types/index.js'

export const settingsController = new Composer<CustomContext>()

type SettingOption = {
	id: 'custom_polls' | 'reminder'
	labelKey: string
	commandId: string
	adminOnly?: boolean
}

const ENABLED_ICON = `<tg-emoji emoji-id="5825794181183836432">✔️</tg-emoji>`
const DISABLED_ICON = `<tg-emoji emoji-id="5364330229043062830">➰</tg-emoji>`
const SETTING_COMMAND_PATTERN = /^set_([a-z0-9]+)_(on|off)$/

const OPTIONS: SettingOption[] = [
	{
		id: 'custom_polls',
		labelKey: 'settings.option.customPolls',
		commandId: 'cp',
		adminOnly: true
	},
	{
		id: 'reminder',
		labelKey: 'settings.option.reminder',
		commandId: 'rem'
	}
]

const OPTION_BY_COMMAND_ID = new Map(
	OPTIONS.map(option => [option.commandId, option])
)
const SETTING_COMMANDS = OPTIONS.flatMap(option => [
	`set_${option.commandId}_on`,
	`set_${option.commandId}_off`
])

function isAdmin(userId: number | undefined) {
	return (
		process.env.ADMIN_ID !== undefined &&
		String(userId) === process.env.ADMIN_ID
	)
}

function getCommandName(text: string) {
	const [command] = text.split(/\s+/, 1)
	return command?.replace(/^\//, '').split('@')[0]
}

function parseSettingCommand(text: string) {
	const commandName = getCommandName(text)
	const match = commandName?.match(SETTING_COMMAND_PATTERN)
	if (!match) {
		return null
	}

	const [, commandId, state] = match
	const option = OPTION_BY_COMMAND_ID.get(commandId)
	if (!option) {
		return null
	}

	return { option, value: state === 'on' }
}

function isSettingEnabled(option: SettingOption, group: Group, userId: number) {
	if (option.id === 'custom_polls') {
		return group.settings.receiveCustomPolls
	}

	return group.settings.tagUsers.some(user => user.userId === userId)
}

function renderSettingsOptions(
	ctx: CustomContext,
	group: Group,
	userId: number
) {
	return OPTIONS.map(option => {
		const enabled = isSettingEnabled(option, group, userId)
		const icon = enabled ? ENABLED_ICON : DISABLED_ICON
		const nextState = enabled ? 'off' : 'on'
		const suffix = option.adminOnly
			? ` · ${ctx.i18n.t('settings.adminOnly')}`
			: ''
		return `${icon} ${ctx.i18n.t(option.labelKey)} /set_${option.commandId}_${nextState}${suffix}`
	}).join('\n')
}

async function replySettings(ctx: CustomContext, group: Group) {
	if (!ctx.from) {
		return
	}

	await ctx.text('state.groupSettings', {
		options: renderSettingsOptions(ctx, group, ctx.from.id)
	})
}

async function applySetting(
	ctx: CustomContext,
	group: Group,
	option: SettingOption,
	value: boolean
) {
	if (option.adminOnly && !isAdmin(ctx.from?.id)) {
		await ctx.text('settings.optionAdminOnly', {
			option: ctx.i18n.t(option.labelKey)
		})
		return false
	}

	if (option.id === 'custom_polls') {
		await updateGroupCustomPollsSetting(ctx.db.groups, group, value)
		group.settings.receiveCustomPolls = value
	} else if (ctx.from) {
		await updateGroupTagUsersSetting(ctx.db.groups, group, ctx.from.id, value)
		group.settings.tagUsers = value
			? [
					...group.settings.tagUsers.filter(
						user => user.userId !== ctx.from?.id
					),
					{ userId: ctx.from.id }
				]
			: group.settings.tagUsers.filter(user => user.userId !== ctx.from?.id)
	}

	return true
}

settingsController
	.chatType(['supergroup', 'group'])
	.command('settings', async ctx => {
		const group = await getGroup(ctx.db.groups, ctx.chat.id)
		if (!group) {
			await ctx.text('error.chatNotFound')
		} else {
			await replySettings(ctx, group)
		}
	})

for (const command of SETTING_COMMANDS) {
	settingsController
		.chatType(['supergroup', 'group'])
		.command(command, async ctx => {
			const group = await getGroup(ctx.db.groups, ctx.chat.id)
			if (!group) {
				await ctx.text('error.chatNotFound')
				return
			}

			const parsed = parseSettingCommand(ctx.message?.text ?? '')
			if (!parsed) {
				await replySettings(ctx, group)
				return
			}

			const updated = await applySetting(
				ctx,
				group,
				parsed.option,
				parsed.value
			)
			if (updated) {
				await replySettings(ctx, group)
			}
		})
}
