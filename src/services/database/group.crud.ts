import type { Database, Group } from '../../types/index.js'

export function createDefaultGroupSettings(): Group['settings'] {
	return {
		tagUsers: [],
		receiveCustomPolls: false,
		receiveDailyPolls: true
	}
}

type GroupRow = {
	group_id: number
	is_channel: number
	receive_custom_polls: number
	receive_daily_polls: number
}

function mapGroup(group: GroupRow, tagUsers: { userId: number }[]): Group {
	return {
		groupId: group.group_id,
		isChannel: Boolean(group.is_channel),
		settings: {
			tagUsers,
			receiveCustomPolls: Boolean(group.receive_custom_polls),
			receiveDailyPolls: Boolean(group.receive_daily_polls)
		}
	}
}

export async function createGroupIfNotExists(
	database: Database,
	groupId: number,
	isChannel = false
) {
	await database
		.insertInto('groups')
		.values({
			group_id: groupId,
			is_channel: Number(isChannel),
			receive_custom_polls: 0,
			receive_daily_polls: 1,
			mongo_id: `sqlite:${groupId}`
		})
		.onConflict(conflict => conflict.column('group_id').doNothing())
		.execute()
}

export async function fetchGroups(database: Database): Promise<Group[]> {
	const [groups, tagUsers] = await Promise.all([
		database.selectFrom('groups').selectAll().orderBy('group_id').execute(),
		database
			.selectFrom('group_tag_users')
			.select(['group_id', 'user_id'])
			.orderBy('group_id')
			.orderBy('user_index')
			.execute()
	])
	const tagUsersByGroup = new Map<number, { userId: number }[]>()
	for (const user of tagUsers) {
		const groupUsers = tagUsersByGroup.get(user.group_id) ?? []
		groupUsers.push({ userId: user.user_id })
		tagUsersByGroup.set(user.group_id, groupUsers)
	}
	return groups.map(group =>
		mapGroup(group, tagUsersByGroup.get(group.group_id) ?? [])
	)
}

export async function getGroup(
	database: Database,
	groupId: number
): Promise<Group | null> {
	const group = await database
		.selectFrom('groups')
		.selectAll()
		.where('group_id', '=', groupId)
		.executeTakeFirst()
	if (!group) {
		return null
	}

	const tagUsers = await database
		.selectFrom('group_tag_users')
		.select(['group_id', 'user_id'])
		.where('group_id', '=', groupId)
		.orderBy('user_index')
		.execute()
	return mapGroup(
		group,
		tagUsers.map(user => ({ userId: user.user_id }))
	)
}

export async function updateGroupSettings(
	database: Database,
	group: Group,
	changes: Partial<Group['settings']>
) {
	const settings = { ...group.settings, ...changes }
	await database
		.updateTable('groups')
		.set({
			receive_custom_polls: Number(settings.receiveCustomPolls),
			receive_daily_polls: Number(settings.receiveDailyPolls)
		})
		.where('group_id', '=', group.groupId)
		.execute()
}
