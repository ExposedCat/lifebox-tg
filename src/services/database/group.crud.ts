import type { Database, Group } from '../../types/index.js'
import { DbQueryBuilder as $ } from '../../helpers/index.js'
import type { UpdateFilter } from 'mongodb'

export function createDefaultGroupSettings(): Group['settings'] {
	return {
		tagUsers: [],
		receiveCustomPolls: false,
		receiveDailyPolls: true
	}
}

function normalizeGroup(group: Group): Group {
	const settings = group.settings as Partial<Group['settings']> | undefined
	const defaults = createDefaultGroupSettings()

	return {
		...group,
		settings: {
			...defaults,
			...settings,
			tagUsers: settings?.tagUsers ?? defaults.tagUsers
		}
	}
}

export async function createGroupIfNotExists(
	database: Database['groups'],
	groupId: number,
	isChannel = false
) {
	await database.updateOne(
		{ groupId },
		$.setOnInsert({
			groupId,
			isChannel,
			settings: createDefaultGroupSettings()
		}),
		$.upsert()
	)
}

export function fetchGroups(database: Database['groups']) {
	return database.find<Group>({}).map(normalizeGroup)
}

export async function getGroup(database: Database['groups'], groupId: number) {
	const group = await database.findOne<Group>({ groupId })
	return group ? normalizeGroup(group) : null
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
		{
			$set: {
				settings: {
					...createDefaultGroupSettings(),
					...group.settings,
					...changes
				}
			}
		}
	)
}
