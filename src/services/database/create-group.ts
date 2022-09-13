import { Collection } from 'mongodb'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function createGroupIfNotExists(groupDb: Collection, groupId: number) {
	const query = { groupId }
	const groupData = query
	await groupDb.updateOne(query, $.setOnInsert(groupData), $.upsert())
}

export { createGroupIfNotExists }
