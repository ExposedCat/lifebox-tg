import { Composer } from 'grammy'

import {
	createGroupIfNotExists,
	createUserIfNotExists
} from '../services/index.ts'
import type { CustomContext } from '../types/index.ts'

// Runs on every group update. Users, groups and memberships are never deleted,
// so once a (chat, user, name) combination is synced it needs no further
// writes until the process restarts or the user renames themselves.
const MAX_SYNCED = 50_000
const synced = new Set<string>()

function markSynced(key: string) {
	if (synced.size >= MAX_SYNCED) synced.clear()
	synced.add(key)
}

const middleware = new Composer<CustomContext>()
middleware
	.chatType(['supergroup', 'group', 'channel'])
	.use(async (ctx, next) => {
		const { db, chat, from } = ctx
		const groupKey = `${chat.id}`
		if (!synced.has(groupKey)) {
			await createGroupIfNotExists(db, chat.id, chat.type === 'channel')
			markSynced(groupKey)
		}
		if (from) {
			const userKey = `${chat.id}:${from.id}:${from.first_name}`
			if (!synced.has(userKey)) {
				await createUserIfNotExists(db, from.id, from.first_name, chat.id)
				markSynced(userKey)
			}
		}
		await next()
	})

export { middleware }
