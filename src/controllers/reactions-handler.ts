import { CustomContext } from '../types/index.js'

import { Composer } from 'grammy'

import { createUserIfNotExists, handleAction } from '../services/index.js'

const controller = new Composer<CustomContext>()
controller
	.chatType('private')
	.hears(/^(-\d+) (\d+) (\d+) (.+) (.+)$/, async ctx => {
		if (ctx.from.id != Number(process.env.REACTIONS_PROVIDER_ID)) {
			return
		}
		const [_, groupId, userId, targetId, targetName, reaction] = ctx.match
		await createUserIfNotExists(
			ctx.db.users,
			Number(userId),
			undefined,
			Number(groupId)
		)
		await createUserIfNotExists(
			ctx.db.users,
			Number(targetId),
			targetName,
			Number(groupId)
		)
		await handleAction(
			ctx.db.users,
			reaction,
			Number(groupId),
			Number(userId),
			Number(targetId),
			targetName
		)
	})

export { controller }
