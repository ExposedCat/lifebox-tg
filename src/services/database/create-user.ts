import { Collection } from 'mongodb'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function createUserIfNotExists(
	userDb: Collection,
	id: number,
	name: string,
	initialGroupId: number
) {
	const query = { userId: id }
	const userData = Object.assign(
		{
			name,
			credits: [
				{
					groupId: initialGroupId,
					credits: Number(process.env.INITIAL_CREDITS),
					lastRated: new Date()
				}
			]
		},
		query
	)
	await userDb.updateOne(query, $.setOnInsert(userData), $.upsert())
}

export { createUserIfNotExists }
