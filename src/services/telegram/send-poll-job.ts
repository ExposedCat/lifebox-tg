import { Group, TelegramApiError } from '../../types/index.js'
import { Collection } from 'mongodb'
import { Api, GrammyError } from 'grammy'
import { I18n } from '@grammyjs/i18n/dist/source'

import cron from 'node-schedule'

import { fetchGroups } from '../index.js'

async function sendPoll(api: Api, i18n: I18n, group: Group) {
	const text = (label: string) =>
		i18n.t(process.env.POLL_LANG, `poll.${label}`)

	const { message_id: pollId } = await api.sendPoll(
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

	return pollId
}

function chatNotFoundError(object: unknown) {
	const error = object as GrammyError
	if (error.description !== TelegramApiError.CHAT_NOT_FOUND) {
		console.error(`Job | Can't post poll: `, error)
	}
}

async function startSendPollJob(api: Api, i18n: I18n, groupsDb: Collection) {
	return cron.scheduleJob(process.env.POLL_TIME, async () => {
		const groups = fetchGroups(groupsDb)

		let firstGroup: Group | null = null
		let pollId: number | null = null
		while (pollId === null) {
			firstGroup = await groups.next()
			if (!firstGroup) {
				break
			}
			try {
				pollId = await sendPoll(api, i18n, firstGroup)
			} catch (object) {
				chatNotFoundError(object)
			}
		}
		if (!firstGroup || pollId === null) {
			return
		}

		try {
			while (await groups.hasNext()) {
				const group = await groups.next()
				if (group) {
					await api.forwardMessage(
						group.groupId,
						firstGroup.groupId,
						pollId
					)
				}
			}
		} catch (object) {
			chatNotFoundError(object)
		}
	})
}

export { startSendPollJob }
