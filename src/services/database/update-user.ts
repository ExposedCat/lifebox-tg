import { Collection } from 'mongodb'

async function updateUser(
	userDb: Collection,
	userId: number,
	groupId: number,
	change: number,
	name?: string
) {
	let operation = userDb.initializeOrderedBulkOp()

	// Create user if not exists
	operation
		.find({ userId })
		.upsert()
		.updateOne({
			$setOnInsert: {
				name,
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

	// Update credits & name if specified
	let update = {
		...(name && { $set: { name } }),
		$inc: {
			'credits.$.credits': change
		}
	}
	operation.find({ userId, 'credits.groupId': groupId }).updateOne(update)

	await operation.execute()
}

export { updateUser }
