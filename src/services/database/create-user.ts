import { Database } from '../../types/index.js'

import { DbQueryBuilder as $ } from '../../helpers/index.js'

async function createUserIfNotExists(
	database: Database['users'],
	id: number,
	name: string | undefined,
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
	await database.updateOne(query, $.setOnInsert(userData), $.upsert())
}

export { createUserIfNotExists }
