import { Collection } from 'mongodb'

import { connectToDb } from '../config/index.js'
import { loadEnv } from '../helpers/index.js'

loadEnv()

async function migrate(collection: Collection) {
	await collection.updateMany({}, [
		{
			$set: { name: undefined }
		}
	])
}

console.info(`Connecting…`)
const { database, client } = await connectToDb()
console.info(`Running migration…`)
await migrate(database.users)
console.info(`Disconnecting…`)
await client.close()
console.info(`Done`)
