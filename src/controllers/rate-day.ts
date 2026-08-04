import { Composer } from 'grammy'

import { getPoll } from '../services/database/poll.js'
import { updateUserDayRate } from '../services/index.js'
import type { CustomContext } from '../types/index.js'

const controller = new Composer<CustomContext>()
controller.on('poll_answer', async ctx => {
	if (ctx.pollAnswer.option_ids.length) {
		const pollId = ctx.pollAnswer.poll_id
		const poll = await getPoll(ctx.db, pollId)
		if (!poll) {
			return
		}
		const userId = ctx.pollAnswer.user?.id
		if (!userId) {
			console.error('Poll answer without user id', ctx.pollAnswer)
			return
		}
		const option = ctx.pollAnswer.option_ids[0]
		const value = [2, 1, 0, -1, -2][option]
		const date = poll.date
		await updateUserDayRate(ctx.db, userId, pollId, value, date)
	}
})

export { controller }
