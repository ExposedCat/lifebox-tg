import type { Database, Group } from '../../types/index.js'
import { TelegramApiError } from '../../types/index.js'
import { setTimeout } from 'timers/promises'
import type { Api, GrammyError } from 'grammy'
import type { I18n } from '@grammyjs/i18n/dist/source'
import cron from 'node-schedule'
import { fetchGroups } from '../index.js'

function getChannelActionUrl(messageId: number | string) {
	return `https://t.me/${process.env.PUBLIC_POLLS_CHAT_NAME}/${messageId}`
}

async function sendInitialPoll(args: { api: Api; i18n: I18n; group: Group }) {
	const { api, i18n, group } = args
	const text = (label: string) => i18n.t(process.env.POLL_LANG, `poll.${label}`)

	const { poll, message_id: messageId } = await api.sendPoll(
		group.groupId,
		text('question'),
		[
			text('option.perfect'),
			text('option.one'),
			text('option.neutral'),
			text('option.minusOne'),
			text('option.awful')
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
	group: Group
	api: Api
	i18n: I18n
	messageId: number
	firstGroupId: number
}) {
	const { api, i18n, group, firstGroupId, messageId } = args
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
	}
}

async function initializePoll(api: Api, i18n: I18n, database: Database) {
	const firstGroupId = Number(process.env.PUBLIC_POLLS_CHAT_ID)

	const date = new Date(new Date().toDateString())
	const existingPoll = await database.polls.findOne({ date })
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

	await database.polls.insertOne({ pollId, messageId, date })

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
				const poll = await database.polls.findOne({
					date: new Date(new Date().toDateString())
				})
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
			await resendPoll({ api, i18n, group, firstGroupId, messageId })
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
	const groups = fetchGroups(database.groups)
	while (await groups.hasNext()) {
		const group = await groups.next()
		if (group) {
			if (group.groupId === firstGroupId) {
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
	}

	return { totalGroups, success }
}

async function startSendPollJob(api: Api, i18n: I18n, database: Database) {
	return cron.scheduleJob(
		process.env.POLL_TIME,
		populatePoll.bind(null, api, i18n, database)
	)
}

export { startSendPollJob, populatePoll, resendPoll, sendPoll }
