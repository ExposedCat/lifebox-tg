import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

import { getUserProfile } from '../services/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).command('profile', async ctx => {
	if (!ctx.from) {
		return
	}
	const profile = await getUserProfile(ctx.db.users, ctx.from.id, ctx.chat.id)
	if (!profile) {
		await ctx.text('error.profileNotFound')
	} else {
		const icon = ctx.i18n.t(`partial.icon.${profile.state}`)
		await ctx.text('fetch.profile', {
			name: ctx.from.username || ctx.from.first_name,
			credits: profile.credits,
			average: profile.averageCredits,
			icon
		})
	}
})

export { controller }
