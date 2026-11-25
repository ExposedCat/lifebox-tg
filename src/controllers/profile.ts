import { Composer } from 'grammy'

import { APP_ENV } from '../config.ts'
import { getUserProfile } from '../services/index.ts'
import type { CustomContext } from '../types/index.ts'

const controller = new Composer<CustomContext>()
controller.chatType(['supergroup', 'group']).command('profile', async ctx => {
	const profile = await getUserProfile(ctx.db, ctx.from.id, ctx.chat.id)
	if (!profile) {
		await ctx.text('error.profileNotFound')
		return
	}
	await ctx.text('fetch.profile', {
		name: profile.user.name || APP_ENV.UNNAMED,
		icon: ctx.i18n.t(`partial.icon.${profile.state}`),
		lifeQuality: profile.user.lifeQuality,
		averageLifeQuality: profile.averageLifeQuality
	})
})

export { controller }
