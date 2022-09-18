import { Database, Group, User } from '../types/index.js'

import { MongoClient } from 'mongodb'

async function connectToDb() {
	const client = new MongoClient(process.env.DB_CONNECTION_STRING)
	await client.connect()
	const mongoDb = client.db()
	const users = mongoDb.collection<User>('users')
	const groups = mongoDb.collection<Group>('groups')
	const database: Database = { users, groups }
	return { database, client }
}

export { connectToDb }
