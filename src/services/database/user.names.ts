import type { OrderedBulkOperation } from 'mongodb'

import type { Database, UserProfile } from '../../types/index.js'
import { DbQueryBuilder as $ } from '../../helpers/index.js'
import { getValueState } from '../credits/get-value-state.js'
import { getAverageLifeQuality, getAverageCredits } from './statistics.js'

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

export async function getUserNames(
	database: Database['users'],
	ids: number[]
): Promise<Record<string | number, string>> {
	const nameList = await database
		.aggregate<{
			name: string
			userId: number
		}>([
			{
				$match: { userId: { $in: ids } }
			},
			{
				$project: {
					_id: 0,
					userId: 1,
					name: 1
				}
			}
		])
		.toArray()
	return Object.fromEntries(nameList.map(({ name, userId }) => [userId, name]))
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

	// Update credits & name if specified
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

export async function updateUserCredits(
	database: Database['users'],
	id: number,
	groupId: number,
	change: number,
	name?: string,
	create = false,
	changed = false
) {
	const operation = database.initializeOrderedBulkOp()

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
	const update = {
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

export async function getUserProfile(
	database: Database['users'],
	userId: number,
	localGroupId: number,
	calcAverage: boolean
) {
	const users = database.aggregate<UserProfile>([
		$.match({ userId }),
		$.project({
			name: 1,
			credits: 1,
			lifeQuality: {
				$round: [{ $avg: '$dayRates.value' }, 1]
			}
		}),
		$.unwind('credits'),
		$.match({ 'credits.groupId': localGroupId }),
		$.project({
			name: 1,
			lifeQuality: 1,
			credits: '$credits.credits',
			lastRated: '$credits.lastRated'
		})
	])

	const user = await users.next()
	if (!user) {
		return null
	}

	let state: string | null = null
	let averageCredits: number | null = null
	let averageLifeQuality: number | null = null
	if (calcAverage) {
		averageLifeQuality = await getAverageLifeQuality(database, localGroupId)
		averageCredits = await getAverageCredits(database, localGroupId)
		state = getValueState(user.credits, averageCredits)
	}

	return { user, averageCredits, averageLifeQuality, state }
}
