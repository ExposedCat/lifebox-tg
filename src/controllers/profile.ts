import { Composer } from 'grammy'

import type { CustomContext } from '../types/index.js'
import { getUserProfile } from '../services/index.js'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).command('profile', async ctx => {
	if (!ctx.from) {
		return
	}
	const profile = await getUserProfile(
		ctx.db.users,
		ctx.from.id,
		ctx.chat.id,
		true
	)
	if (!profile) {
		await ctx.text('error.profileNotFound')
	} else {
		await ctx.text('fetch.profile', {
			name: profile.user.name || process.env.UNNAMED,
			icon: ctx.i18n.t(`partial.icon.${profile.state}`),
			credits: profile.user.credits,
			averageCredits: profile.averageCredits,
			lifeQuality: profile.user.lifeQuality,
			averageLifeQuality: profile.averageLifeQuality
		})
	}
})

export { controller }
