import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'
import { updateUserDayRate } from '../services/index.js'

const controller = new Composer<CustomContext>()
controller.on('poll_answer', async ctx => {
	if (ctx.pollAnswer.option_ids.length) {
		const pollId = ctx.pollAnswer.poll_id
		const userId = ctx.pollAnswer.user.id
		const option = ctx.pollAnswer.option_ids[0]
		const value = [2, 1, 0, -1, -2][option]
		await updateUserDayRate(ctx.db.users, userId, pollId, value)
	}
})

export { controller }
