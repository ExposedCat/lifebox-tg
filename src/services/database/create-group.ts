import { Database } from '../../types/index.js'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function createGroupIfNotExists(
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

export { createGroupIfNotExists }
