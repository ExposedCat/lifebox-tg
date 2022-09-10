import { Collection } from 'mongodb'

async function createGroupIfNotExists(groupDb: Collection, groupId: number) {
	const groupData = { groupId }
	await groupDb.updateOne(
		groupData,
		{ $setOnInsert: groupData },
		{ upsert: true }
	)
}

export { createGroupIfNotExists }
