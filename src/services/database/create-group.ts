import { Database } from '../../types/index.js'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function createGroupIfNotExists(
	database: Database['groups'],
	groupId: number
) {
	const query = { groupId }
	const groupData = query
	await database.updateOne(query, $.setOnInsert(groupData), $.upsert())
}

export { createGroupIfNotExists }
