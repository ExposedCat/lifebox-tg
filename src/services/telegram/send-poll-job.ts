import { setTimeout } from 'node:timers/promises'
import type { I18n } from '@grammyjs/i18n'
import { type Api, GrammyError } from 'grammy'
import type { InputPollOption } from 'grammy/types'
import cron from 'node-schedule'

import { APP_ENV } from '../../config.ts'
import type { Database, Group } from '../../types/index.ts'
import { TelegramApiError } from '../../types/index.ts'
import { fetchGroups } from '../database/group.crud.ts'
import { createPoll, getPollByDate } from '../database/poll.ts'
import { getUserNames } from '../database/user.names.ts'

const WORD_JOINER = '⁠'
const INITIAL_POLL_ATTEMPTS = 10
const SEND_ATTEMPTS = 6

const t = (i18n: I18n, key: string, data?: Record<string, unknown>) =>
	i18n.t(APP_ENV.POLL_LANG, key, data)

/** Today's poll key: local midnight. */
const today = () => new Date(new Date().toDateString())

function pollOption(
	number: string,
	label: string,
	customEmojiId: string
): InputPollOption {
	return {
		text: `${number} ▫️ · ${label}`,
		text_entities: [
			{
				type: 'custom_emoji',
				offset: number.length + 1,
				length: 2,
				custom_emoji_id: customEmojiId
			}
		]
	}
}

export async function sendDailyPoll(args: {
	api: Api
	i18n: I18n
	chatId: number | string
}) {
	const { api, i18n, chatId } = args
	const { poll, message_id: messageId } = await api.sendPoll(
		chatId,
		t(i18n, 'poll.question'),
		[
			pollOption('+2', 'amazing news', '6334732769079330250'),
			pollOption('+1', 'great day', '6334334234768967026'),
			pollOption(`${WORD_JOINER}  0`, 'usual day', '6334831862564783755'),
			pollOption('-1', 'bad day', '6334458694331270658'),
			pollOption('-2', 'horrible news', '6334676346093963090')
		],
		{ is_anonymous: false }
	)
	return { pollId: poll.id, messageId }
}

// Telegram intermittently answers "chat not found" for chats that exist, so
// only that error is worth retrying.
function isChatNotFoundError(error: unknown) {
	if (
		error instanceof GrammyError &&
		error.description === TelegramApiError.CHAT_NOT_FOUND
	) {
		return true
	}
	console.warn(
		"Job | Can't post poll:",
		error instanceof GrammyError ? error.description : error
	)
	return false
}

export async function resendPoll(args: {
	database: Database
	group: Group
	api: Api
	i18n: I18n
	messageId: number
	firstGroupId: number
}) {
	const { database, api, i18n, group, firstGroupId, messageId } = args
	if (group.isChannel) {
		await api.sendMessage(group.groupId, t(i18n, 'poll.channelQuestion'), {
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: t(i18n, 'button.channelAction'),
							url: `https://t.me/${APP_ENV.PUBLIC_POLLS_CHAT_NAME}/${messageId}`
						}
					]
				]
			}
		})
		return
	}

	await api.forwardMessage(group.groupId, firstGroupId, messageId)
	const { tagUsers } = group.settings
	if (tagUsers.length === 0) return

	const names = await getUserNames(
		database,
		tagUsers.map(user => user.userId)
	)
	const users = tagUsers
		.map(user =>
			t(i18n, 'partial.userTag', { id: user.userId, name: names[user.userId] })
		)
		.join(', ')
	await api.sendMessage(group.groupId, t(i18n, 'job.reminder', { users }), {
		parse_mode: 'HTML'
	})
}

/** Posts today's poll to the public chat once; returns its message ID. */
async function initializePoll(api: Api, i18n: I18n, database: Database) {
	const date = today()
	const existingPoll = await getPollByDate(database, date)
	if (existingPoll?.messageId) {
		return existingPoll.messageId
	}

	for (let attempt = 1; attempt <= INITIAL_POLL_ATTEMPTS; attempt++) {
		let sent: Awaited<ReturnType<typeof sendDailyPoll>>
		try {
			sent = await sendDailyPoll({
				api,
				i18n,
				chatId: APP_ENV.PUBLIC_POLLS_CHAT_ID
			})
		} catch (error) {
			isChatNotFoundError(error)
			if (attempt < INITIAL_POLL_ATTEMPTS) await setTimeout(1_000)
			continue
		}
		await createPoll(database, { ...sent, date })
		return sent.messageId
	}
	console.error(
		"Job | Can't initiate poll job: something is wrong with first chat"
	)
	return null
}

/** Forwards today's poll to one group; resolves to whether it was delivered. */
export async function sendPoll(
	api: Api,
	i18n: I18n,
	database: Database,
	group: Group,
	pollMessageId?: number
) {
	const messageId =
		pollMessageId ??
		(await getPollByDate(database, today()))?.messageId ??
		(await initializePoll(api, i18n, database))
	if (!messageId) {
		console.error("Job | Can't post poll: today's poll is unavailable")
		return false
	}

	for (let attempt = 1; attempt <= SEND_ATTEMPTS; attempt++) {
		try {
			await resendPoll({
				database,
				api,
				i18n,
				group,
				firstGroupId: APP_ENV.PUBLIC_POLLS_CHAT_ID,
				messageId
			})
			return true
		} catch (error) {
			if (!isChatNotFoundError(error)) return false
		}
	}
	console.error(
		`Job | Can't post poll to ${group.groupId}: chat not found after ${SEND_ATTEMPTS} attempts`
	)
	return false
}

// The API throttler paces these sends, so groups are processed back-to-back.
export async function populatePoll(api: Api, i18n: I18n, database: Database) {
	let totalGroups = 0
	let success = 0
	const messageId = await initializePoll(api, i18n, database)
	if (messageId === null) {
		return { totalGroups, success }
	}
	for (const group of await fetchGroups(database)) {
		if (
			group.groupId === APP_ENV.PUBLIC_POLLS_CHAT_ID ||
			!group.settings.receiveDailyPolls
		) {
			continue
		}
		totalGroups += 1
		if (await sendPoll(api, i18n, database, group, messageId)) {
			success += 1
		}
	}
	return { totalGroups, success }
}

export function startSendPollJob(api: Api, i18n: I18n, database: Database) {
	return cron.scheduleJob(
		{ rule: APP_ENV.POLL_TIME, tz: 'Europe/Prague' },
		async () => {
			try {
				const { totalGroups, success } = await populatePoll(api, i18n, database)
				console.info(`Job | Poll sent to ${success}/${totalGroups} groups`)
			} catch (error) {
				console.error('Job | Daily poll failed:', error)
			}
		}
	)
}
