import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

import {
	getAverageCredits,
	getCreditState,
	getTopSocialUsers
} from '../services/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).command('social', async ctx => {
	const groupId = ctx.chat.id
	const userDb = ctx.db.users
	const users = await getTopSocialUsers(userDb, groupId)
	if (!users.length) {
		await ctx.text('error.usersNotFound')
	} else {
		const averageCredits = await getAverageCredits(userDb, groupId)
		let userList = ''
		for (let i = 0; i < users.length; ++i) {
			const user = users[i]
			const state = getCreditState(user.credits, averageCredits)
			userList += ctx.i18n.t('partial.userLine', {
				name: user.name || process.env.UNNAMED,
				position: i + 1,
				credits: user.credits,
				icon: ctx.i18n.t(`partial.icon.${state}`)
			})
		}
		await ctx.text('fetch.socialRating', {
			userList,
			average: averageCredits
		})
	}
})

export { controller }
