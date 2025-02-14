import type { Database } from '../types/index.js'
import { connectToDb } from '../init/index.js'
import { loadEnv } from '../helpers/index.js'

loadEnv()

async function migrate(database: Database['users']) {
	await database.updateMany(
		{},
		{
			$set: { 'credits.$[].credits': 0 }
		}
	)
}

console.info('Connecting…')
const { database, client } = await connectToDb()
console.info('Running migration…')
await migrate(database.users)
console.info('Disconnecting…')
await client.close()
console.info('Done')
