import { Group } from '../types/index.js'
import { Collection } from 'mongodb'
import { Api } from 'grammy'
import { I18n } from '@grammyjs/i18n/dist/source'

import cron from 'node-schedule'

import { fetchGroups } from './index.js'

async function sendPoll(api: Api, i18n: I18n, group: Group) {
	const text = (label: string) =>
		i18n.t(process.env.POLL_LANG, `poll.${label}`)

	await api.sendPoll(
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
}

async function startSendPollJob(api: Api, i18n: I18n, groupsDb: Collection) {
	return cron.scheduleJob(process.env.POLL_TIME, async () => {
		const groups = fetchGroups(groupsDb)
		while (await groups.hasNext()) {
			const group = await groups.next()
			if (group) {
				await sendPoll(api, i18n, group)
			}
		}
	})
}

export { startSendPollJob }
