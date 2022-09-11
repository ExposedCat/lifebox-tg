import { Collection } from 'mongodb'

async function updateUser(
	userDb: Collection,
	userId: number,
	groupId: number,
	change: number
) {
	let operation = userDb.initializeOrderedBulkOp()

	// Create user if not exists
	operation
		.find({ userId })
		.upsert()
		.updateOne({
			$setOnInsert: {
				credits: []
			}
		})

	// Create user local data if not exists
	operation
		.find({
			userId,
			'credits.groupId': { $ne: groupId }
		})
		.updateOne({
			$push: {
				credits: { groupId, credits: 0 }
			}
		})

	// Update credits
	operation.find({ userId, 'credits.groupId': groupId }).updateOne({
		$inc: {
			'credits.$.credits': change
		}
	})

	await operation.execute()
}

export { updateUser }