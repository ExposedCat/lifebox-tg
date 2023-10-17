import type { Database, Group } from '../../types/index.js'
import { DbQueryBuilder as $ } from '../../helpers/index.js'

export async function createGroupIfNotExists(
	database: Database['groups'],
	groupId: number,
	isChannel = false
) {
	await database.updateOne(
		{ groupId },
		$.setOnInsert({ groupId, isChannel }),
		$.upsert()
	)
}

export function fetchGroups(database: Database['groups']) {
	return database.find<Group>({})
}
