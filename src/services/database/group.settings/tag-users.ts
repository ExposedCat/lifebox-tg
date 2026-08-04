import { sql } from 'kysely'

import type { Database, Group } from '../../../types/database.js'

export async function updateGroupTagUsersSetting(
	database: Database,
	group: Group,
	userId: number,
	newValue: boolean
) {
	const enabled = group.settings.tagUsers.some(user => user.userId === userId)
	if ((enabled && newValue) || (!enabled && !newValue)) {
		return
	}

	if (!newValue) {
		await database
			.deleteFrom('group_tag_users')
			.where('group_id', '=', group.groupId)
			.where('user_id', '=', userId)
			.execute()
		return
	}

	await database
		.insertInto('group_tag_users')
		.values({
			group_id: group.groupId,
			user_id: userId,
			user_index: sql<number>`(
				SELECT COALESCE(MAX(user_index), -1) + 1
				FROM group_tag_users
				WHERE group_id = ${group.groupId}
			)`
		})
		.execute()
}
