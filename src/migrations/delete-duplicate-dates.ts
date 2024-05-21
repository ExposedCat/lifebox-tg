import type { AnyBulkWriteOperation } from 'mongodb'

import type { Database, User } from '../types/index.js'
import { connectToDb } from '../init/index.js'
import { loadEnv } from '../helpers/index.js'

loadEnv()

async function migrate(database: Database['users']) {
	const operations: AnyBulkWriteOperation<User>[] = []
	const users = database.find()
	while (await users.hasNext()) {
		const user = await users.next()
		if (!user) {
			continue
		}
		const uniqueDates = new Set(user.dayRates.map(it => Number(it.date)))
		user.dayRates.reverse()
		const uniqueRates = [...uniqueDates].map(
			date => user.dayRates.find(it => Number(it.date) === date)!
		)
		operations.push({
			updateOne: {
				filter: {
					userId: user.userId
				},
				update: {
					$set: {
						dayRates: uniqueRates
					}
				}
			}
		})
	}
	return database.bulkWrite(operations)
}

console.info('Connecting…')
const { database, client } = await connectToDb()
console.info('Running migration…')
const result = await migrate(database.users)
console.info('Result:', JSON.stringify(result, null, 2))
console.info('Disconnecting…')
await client.close()
console.info('Done')
