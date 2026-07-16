import type { OrderedBulkOperation } from 'mongodb'

import type { Database, UserProfile } from '../../types/index.js'
import { DbQueryBuilder as $ } from '../../helpers/index.js'
import { getValueState } from '../statistics/get-value-state.js'
import { getAverageLifeQuality } from './statistics.js'

function addUserCreationStage(operation: OrderedBulkOperation, userId: number) {
	operation
		.find({ userId })
		.upsert()
		.updateOne({
			$setOnInsert: {
				dayRates: []
			}
		})
}

export async function createUserIfNotExists(
	database: Database['users'],
	id: number,
	name: string,
	initialGroupId: number
) {
	await database.updateOne(
		{ userId: id },
		{
			$setOnInsert: { dayRates: [] },
			$addToSet: { groups: initialGroupId },
			...(name ? { $set: { name } } : {})
		},
		{ upsert: true }
	)
}

export async function updateUserDayRate(
	database: Database['users'],
	id: number,
	pollId: string,
	value: number,
	date: Date
) {
	const operation = database.initializeOrderedBulkOp()

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

	// Update day rate
	operation
		.find({
			userId: id,
			'dayRates.pollId': pollId
		})
		.updateOne(
			$.set({
				'dayRates.$.value': value,
				'dayRates.$.date': date
			})
		)

	await operation.execute()
}

export async function getUserProfile(
	database: Database['users'],
	userId: number,
	localGroupId: number,
	calcAverage: boolean
) {
	const users = database.aggregate<UserProfile>([
		$.match({ userId }),
		$.project({
			_id: 0,
			name: 1,
			lifeQuality: $.round({ $ifNull: [{ $avg: '$dayRates.value' }, 0] }, 1)
		})
	])

	const user = await users.next()
	if (!user) {
		return null
	}

	let state: string | null = null
	let averageLifeQuality: number | null = null
	if (calcAverage) {
		averageLifeQuality = await getAverageLifeQuality(database, localGroupId)
		state = getValueState(user.lifeQuality, averageLifeQuality)
	}

	return { user, averageLifeQuality, state }
}
