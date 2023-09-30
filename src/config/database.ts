import type { Database, Poll, Group, User } from '../types/index.js'
import { MongoClient } from 'mongodb'

async function connectToDb() {
	const client = new MongoClient(process.env.DB_CONNECTION_STRING)
	await client.connect()
	const mongoDb = client.db()
	const users = mongoDb.collection<User>('users')
	const groups = mongoDb.collection<Group>('groups')
	const polls = mongoDb.collection<Poll>('polls')
	const database: Database = { users, groups, polls }
	return { database, client }
}

export { connectToDb }
