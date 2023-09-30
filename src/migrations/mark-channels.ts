import type { Database } from '../types/index.js'
import { connectToDb } from '../config/index.js'
import { loadEnv } from '../helpers/index.js'

loadEnv()

async function migrate(database: Database['groups']) {
	await database.updateMany(
		{},
		{
			$set: { isChannel: false }
		}
	)
}

console.info('Connecting…')
const { database, client } = await connectToDb()
console.info('Running migration…')
await migrate(database.groups)
console.info('Disconnecting…')
await client.close()
console.info('Done')
