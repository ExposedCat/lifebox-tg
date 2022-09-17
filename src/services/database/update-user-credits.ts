import { Collection } from 'mongodb'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function updateUserCredits(
	userDb: Collection,
	id: number,
	groupId: number,
	change: number,
	name?: string
) {
	let operation = userDb.initializeOrderedBulkOp()

	// Create user local data if not exists
	operation
		.find({
			userId: id,
			'credits.groupId': $.ne(groupId)
		})
		.updateOne(
			$.push({
				credits: {
					groupId,
					credits: Number(process.env.INITIAL_CREDITS)
				}
			})
		)

	// Update credits & name if specified
	let update = {
		...(name && $.set({ name })),
		...$.inc('credits.$.credits', change),
		...$.set({ 'credits.$.lastRated': new Date() })
	}
	operation
		.find({
			userId: id,
			'credits.groupId': groupId
		})
		.updateOne(update)

	await operation.execute()
}

export { updateUserCredits }
