import { Database } from '../../types/index.js'

import { updateUserCredits } from './update-user.js'

async function createUserIfNotExists(
	database: Database['users'],
	id: number,
	name: string,
	initialGroupId: number
) {
	await updateUserCredits(
		database,
		id,
		initialGroupId,
		Number(process.env.INITIAL_CREDITS),
		name
	)
}

export { createUserIfNotExists }
