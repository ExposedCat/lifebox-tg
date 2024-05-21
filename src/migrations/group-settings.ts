import type { Database } from '../types/index.js'
import { connectToDb } from '../init/index.js'
import { loadEnv } from '../helpers/index.js'

loadEnv()

async function migrate(database: Database['groups']) {
	await database.updateMany(
		{},
		{
			$set: {
				settings: {
					tagUsers: [],
					receiveCustomPolls: false
				}
			}
		}
	)
}

console.info('Starting app…')
const { database } = await connectToDb()
console.info('Running migration…')
await migrate(database.groups)
console.info('Disconnecting…')
console.info('Done')
process.exit(0)
