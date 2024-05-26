import type { Database, Group } from '../../types/index.js'
import { DbQueryBuilder as $ } from '../../helpers/index.js'
import type { UpdateFilter } from 'mongodb'

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

export function getGroup(database: Database['groups'], groupId: number) {
	return database.findOne<Group>({ groupId })
}

export function updateGroup(
	database: Database['groups'],
	group: Group,
	rawUpdate: UpdateFilter<Group>
) {
	return database.updateOne({ groupId: group.groupId }, rawUpdate)
}

export function updateGroupSettings(
	database: Database['groups'],
	group: Group,
	changes: Partial<Group['settings']>
) {
	return database.updateOne(
		{ groupId: group.groupId },
		{ $set: { settings: { ...group.settings, ...changes } } }
	)
}
