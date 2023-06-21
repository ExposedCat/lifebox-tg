import { Database } from '../../types/index.js'
import { OrderedBulkOperation } from 'mongodb'
import { DbQueryBuilder as $ } from '../../helpers/index.js'

function addUserCreationStage(operation: OrderedBulkOperation, userId: number) {
	operation
		.find({ userId })
		.upsert()
		.updateOne({
			$setOnInsert: {
				credits: [],
				dayRates: []
			}
		})
}

async function updateUserDayRate(
	database: Database['users'],
	id: number,
	pollId: string,
	value: number
) {
	let operation = database.initializeOrderedBulkOp()

	// Create user if not exists
	addUserCreationStage(operation, id)

	// Create user local data if not exists
	operation
		.find({
			userId: id,
			'dayRates.pollId': $.ne(pollId)
		})
		.updateOne(
			$.push({
				dayRates: { pollId }
			})
		)

	// Update credits & name if specified
	operation
		.find({
			userId: id,
			'dayRates.pollId': pollId
		})
		.updateOne(
			$.set({
				'dayRates.$.value': value,
				'dayRates.$.date': new Date()
			})
		)

	await operation.execute()
}

async function updateUserCredits(
	database: Database['users'],
	id: number,
	groupId: number,
	change: number,
	name?: string,
	create = false,
	changed = false
) {
	let operation = database.initializeOrderedBulkOp()

	// Create user if not exists
	addUserCreationStage(operation, id)

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
	const hasSet = name && !create && changed
	let update = {
		...$.inc('credits.$.credits', change),
		...(hasSet &&
			$.set({
				...(name && { name }),
				...(!create && changed && { 'credits.$.lastRated': new Date() })
			}))
	}
	operation
		.find({
			userId: id,
			'credits.groupId': groupId
		})
		.updateOne(update)

	await operation.execute()
}

export { updateUserCredits, updateUserDayRate }
