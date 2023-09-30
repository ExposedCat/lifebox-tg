import type { Database } from '../types/index.js'
import { connectToDb } from '../config/index.js'
import { loadEnv } from '../helpers/index.js'

loadEnv()

async function migrate(database: Database['users']) {
	return database.updateMany({}, [
		{
			$set: {
				dayRates: {
					$map: {
						input: '$dayRates',
						in: {
							$mergeObjects: [
								'$$this',
								{
									date: {
										$dateTrunc: {
											date: '$$this.date',
											unit: 'day'
										}
									}
								}
							]
						}
					}
				}
			}
		}
	])
}

console.info('Connecting…')
const { database, client } = await connectToDb()
console.info('Running migration…')
const result = await migrate(database.users)
console.info('Result:', JSON.stringify(result, null, 2))
console.info('Disconnecting…')
await client.close()
console.info('Done')
