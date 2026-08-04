import type { I18n } from '@grammyjs/i18n/dist/source'
import type { Api, GrammyError } from 'grammy'
import type { InputPollOption } from 'grammy/types'
import cron from 'node-schedule'
import { setTimeout } from 'timers/promises'

import type { Database, Group } from '../../types/index.js'
import { TelegramApiError } from '../../types/index.js'
import { createPoll, getPollByDate } from '../database/poll.js'
import { getUserNames } from '../database/user.names.js'
import { fetchGroups } from '../index.js'

const WORD_JOINER = '\u2060'

function getChannelActionUrl(messageId: number | string) {
	return `https://t.me/${process.env.PUBLIC_POLLS_CHAT_NAME}/${messageId}`
}

function pollOption(
	number: string,
	label: string,
	customEmojiId: string
): InputPollOption {
	const emojiOffset = number.length + 1
	return {
		text: `${number} ▫️ · ${label}`,
		text_entities: [
			{
				type: 'custom_emoji',
				offset: emojiOffset,
				length: 2,
				custom_emoji_id: customEmojiId
			}
		]
	}
}

async function sendInitialPoll(args: { api: Api; i18n: I18n; group: Group }) {
	const { api, i18n, group } = args
	return sendDailyPoll({ api, i18n, chatId: group.groupId })
}

async function sendDailyPoll(args: {
	api: Api
	i18n: I18n
	chatId: number | string
}) {
	const { api, i18n, chatId } = args
	const text = (label: string) => i18n.t(process.env.POLL_LANG, `poll.${label}`)

	const { poll, message_id: messageId } = await api.sendPoll(
		chatId,
		text('question'),
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

function isChatNotFoundError(object: unknown) {
	const error = object as GrammyError
	if (error.description !== TelegramApiError.CHAT_NOT_FOUND) {
		console.warn("Job | Can't post poll: ", error.description)
		return false
	}
	return true
}

async function resendPoll(args: {
	database: Database
	group: Group
	api: Api
	i18n: I18n
	messageId: number
	firstGroupId: number
}) {
	const { database, api, i18n, group, firstGroupId, messageId } = args
	if (group.isChannel) {
		await api.sendMessage(
			group.groupId,
			i18n.t(process.env.POLL_LANG, 'poll.channelQuestion'),
			{
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: i18n.t(process.env.POLL_LANG, 'button.channelAction'),
								url: getChannelActionUrl(messageId ?? '')
							}
						]
					]
				}
			}
		)
	} else {
		await api.forwardMessage(group.groupId, firstGroupId, messageId)
		if (group.settings.tagUsers.length !== 0) {
			const names = await getUserNames(
				database,
				group.settings.tagUsers.map(user => user.userId)
			)
			await api.sendMessage(
				group.groupId,
				i18n.t(process.env.POLL_LANG, 'job.reminder', {
					users: group.settings.tagUsers
						.map(user =>
							i18n.t(process.env.POLL_LANG, 'partial.userTag', {
								id: user.userId,
								name: names[user.userId]
							})
						)
						.join(', ')
				}),
				{ parse_mode: 'HTML' }
			)
		}
	}
}

async function initializePoll(api: Api, i18n: I18n, database: Database) {
	const firstGroupId = Number(process.env.PUBLIC_POLLS_CHAT_ID)

	const date = new Date(new Date().toDateString())
	const existingPoll = await getPollByDate(database, date)
	if (existingPoll && existingPoll.messageId) {
		return { messageId: existingPoll.messageId }
	}

	let messageId: number | null = null
	let pollId: string | null = null
	let retriesLeft = 10
	while (pollId === null && retriesLeft) {
		try {
			const data = await sendInitialPoll({
				api,
				i18n,
				group: {
					isChannel: false,
					groupId: firstGroupId
				} as Group
			})
			messageId = data.messageId
			pollId = data.pollId
		} catch (object) {
			isChatNotFoundError(object)
		}
		retriesLeft -= 1
	}
	if (messageId === null || pollId === null) {
		if (!retriesLeft) {
			console.error(
				"Job | Can't initiate poll job: something is wrong with first chat"
			)
		}
		return { messageId }
	}

	await createPoll(database, { pollId, messageId, date })

	return { messageId }
}

async function sendPoll(
	api: Api,
	i18n: I18n,
	database: Database,
	group: Group,
	pollMessageId?: number
) {
	const firstGroupId = Number(process.env.PUBLIC_POLLS_CHAT_ID)
	let retriesLeft = 5
	let repeat = false
	do {
		try {
			let messageId = pollMessageId
			if (!messageId) {
				const poll = await getPollByDate(
					database,
					new Date(new Date().toDateString())
				)
				if (poll) {
					messageId = poll.messageId
				} else {
					const initializedPoll = await initializePoll(api, i18n, database)
					if (!initializedPoll.messageId) {
						console.error(
							"Job | Can't post poll: initial poll not found and failed to initialize"
						)
						return
					}
					messageId = initializedPoll.messageId
				}
				if (!messageId) {
					// NOTE: This should only happen with old polls, i.e. never
					console.error("Job | Can't post poll: initial poll has no message ID")
					return
				}
			}
			await resendPoll({
				database,
				api,
				i18n,
				group,
				firstGroupId,
				messageId
			})
		} catch (object) {
			repeat = isChatNotFoundError(object)
		}
	} while (repeat && retriesLeft--)
	if (!retriesLeft) {
		console.error("Job | Can't post poll: Telegram API fucked up")
	}
}

async function populatePoll(api: Api, i18n: I18n, database: Database) {
	let totalGroups = 0
	let success = 0
	const firstGroupId = Number(process.env.PUBLIC_POLLS_CHAT_ID)
	const { messageId } = await initializePoll(api, i18n, database)
	if (messageId === null) {
		return { totalGroups, success }
	}
	const groups = await fetchGroups(database)
	for (const group of groups) {
		if (group.groupId === firstGroupId) {
			continue
		}
		if (!group.settings.receiveDailyPolls) {
			continue
		}
		totalGroups += 1
		try {
			await sendPoll(api, i18n, database, group, messageId)
			success += 1
			await setTimeout(1_000)
		} catch {
			// Ignore
		}
	}

	return { totalGroups, success }
}

async function startSendPollJob(api: Api, i18n: I18n, database: Database) {
	return cron.scheduleJob(
		{
			rule: process.env.POLL_TIME,
			tz: 'Europe/Prague'
		},
		populatePoll.bind(null, api, i18n, database)
	)
}

export { startSendPollJob, populatePoll, resendPoll, sendPoll, sendDailyPoll }
