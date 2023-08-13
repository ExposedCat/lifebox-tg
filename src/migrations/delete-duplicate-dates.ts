import { Database, User } from '../types/index.js'

import { connectToDb } from '../config/index.js'
import { loadEnv } from '../helpers/index.js'
import { AnyBulkWriteOperation } from 'mongodb'

loadEnv()

async function migrate(database: Database['users']) {
	let operations: AnyBulkWriteOperation<User>[] = []
	const users = database.find()
	while (await users.hasNext()) {
		const user = await users.next()
		if (!user) {
			continue
		}
		const uniqueDates = new Set(user.dayRates.map(it => Number(it.date)))
		user.dayRates.reverse()
		const uniqueRates = [...uniqueDates].map(date => user.dayRates.find(it => Number(it.date) === date)!)
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

console.info(`Connecting…`)
const { database, client } = await connectToDb()
console.info(`Running migration…`)
const result = await migrate(database.users)
console.info(`Result:`, JSON.stringify(result, null, 2))
console.info(`Disconnecting…`)
await client.close()
console.info(`Done`)
