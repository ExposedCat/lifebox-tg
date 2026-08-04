import type { Database, Poll } from '../../types/index.js'

export async function getPoll(
	database: Database,
	pollId: string
): Promise<Poll | null> {
	const poll = await database
		.selectFrom('polls')
		.selectAll()
		.where('poll_id', '=', pollId)
		.executeTakeFirst()
	if (!poll) {
		return null
	}
	return {
		pollId: poll.poll_id,
		messageId: poll.message_id ?? undefined,
		date: new Date(poll.date)
	}
}

export async function getPollByDate(
	database: Database,
	date: Date
): Promise<Poll | null> {
	const poll = await database
		.selectFrom('polls')
		.selectAll()
		.where('date', '=', date.getTime())
		.executeTakeFirst()
	if (!poll) {
		return null
	}
	return {
		pollId: poll.poll_id,
		messageId: poll.message_id ?? undefined,
		date: new Date(poll.date)
	}
}

export async function createPoll(database: Database, poll: Poll) {
	await database
		.insertInto('polls')
		.values({
			poll_id: poll.pollId,
			message_id: poll.messageId ?? null,
			date: poll.date.getTime()
		})
		.execute()
}
