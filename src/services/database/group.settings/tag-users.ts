import { sql } from 'kysely'

import type { Database, Group } from '../../../types/database.js'

export async function updateGroupTagUsersSetting(
	database: Database,
	group: Group,
	userId: number,
	newValue: boolean
) {
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
		.columns(['group_id', 'user_index', 'user_id'])
		.expression(eb =>
			eb
				.selectFrom('group_tag_users')
				.select([
					eb.val(group.groupId).as('group_id'),
					sql<number>`COALESCE(MAX(user_index), -1) + 1`.as('user_index'),
					eb.val(userId).as('user_id')
				])
				.where('group_id', '=', group.groupId)
				.having(
					sql<number>`COUNT(CASE WHEN user_id = ${userId} THEN 1 END)`,
					'=',
					0
				)
		)
		.execute()
}
