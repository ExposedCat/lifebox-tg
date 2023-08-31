import { Database, Group, TelegramApiError } from '../../types/index.js'
import { Api, GrammyError } from 'grammy'
import { I18n } from '@grammyjs/i18n/dist/source'

import cron from 'node-schedule'

import { fetchGroups } from '../index.js'

async function sendPoll(api: Api, i18n: I18n, group: Group) {
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
		console.warn(`Job | Can't post poll: `, error.description)
		return false
	}
	return true
}

// TODO: Move to the service
async function populatePoll(
	api: Api,
	i18n: I18n,
	database: Database
) {
	const groups = fetchGroups(database.groups)

	let firstGroup: Group | null = null
	let messageId: number | null = null
	let pollId: string | null = null
	while (pollId === null) {
		firstGroup = await groups.next()
		if (!firstGroup) {
			break
		}
		try {
			const data = await sendPoll(api, i18n, firstGroup)
			messageId = data.messageId
			pollId = data.pollId
		} catch (object) {
			isChatNotFoundError(object)
		}
	}
	if (!firstGroup || messageId === null || pollId === null) {
		return
	}

	await database.polls.insertOne({
		pollId,
		date: new Date(new Date().toDateString())
	})

	while (await groups.hasNext()) {
		const group = await groups.next()
		if (group) {
			let tries = 5
			let repeat = false
			do {
				try {
					await api.forwardMessage(group.groupId, firstGroup.groupId, messageId)
				} catch (object) {
					repeat = isChatNotFoundError(object)
				}
			} while (repeat && tries--)
			if (!tries) {
				console.error(`Job | Can't post poll: Telegram API fucked up`)
			}
		}
	}
}

async function startSendPollJob(
	api: Api,
	i18n: I18n,
	database: Database
) {
	return cron.scheduleJob(
		process.env.POLL_TIME,
		populatePoll.bind(null, api, i18n, database)
	)
}

export { startSendPollJob, populatePoll }
