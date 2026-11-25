import { sql } from 'kysely'

import type { Database, DatabaseSchema, Group } from '../../types/index.ts'

type GroupRow = DatabaseSchema['groups']

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
			receive_daily_polls: 1
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
		const groupUsers = tagUsersByGroup.get(user.group_id)
		if (groupUsers) groupUsers.push({ userId: user.user_id })
		else tagUsersByGroup.set(user.group_id, [{ userId: user.user_id }])
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

export type GroupPollSettings = Pick<
	Group['settings'],
	'receiveCustomPolls' | 'receiveDailyPolls'
>

export async function updateGroupSettings(
	database: Database,
	groupId: number,
	changes: Partial<GroupPollSettings>
) {
	await database
		.updateTable('groups')
		.set({
			...(changes.receiveCustomPolls !== undefined && {
				receive_custom_polls: Number(changes.receiveCustomPolls)
			}),
			...(changes.receiveDailyPolls !== undefined && {
				receive_daily_polls: Number(changes.receiveDailyPolls)
			})
		})
		.where('group_id', '=', groupId)
		.execute()
}

/** Adds or removes a user from the group's daily poll reminder list. */
export async function setGroupTagUser(
	database: Database,
	groupId: number,
	userId: number,
	enabled: boolean
) {
	if (!enabled) {
		await database
			.deleteFrom('group_tag_users')
			.where('group_id', '=', groupId)
			.where('user_id', '=', userId)
			.execute()
		return
	}

	// Appends the user unless they are already on the list.
	await database
		.insertInto('group_tag_users')
		.columns(['group_id', 'user_index', 'user_id'])
		.expression(eb =>
			eb
				.selectFrom('group_tag_users')
				.select([
					eb.val(groupId).as('group_id'),
					sql<number>`COALESCE(MAX(user_index), -1) + 1`.as('user_index'),
					eb.val(userId).as('user_id')
				])
				.where('group_id', '=', groupId)
				.having(
					sql<number>`COUNT(CASE WHEN user_id = ${userId} THEN 1 END)`,
					'=',
					0
				)
		)
		.execute()
}
