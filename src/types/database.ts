import { ObjectId, Collection } from 'mongodb'

interface Group {
	_id: ObjectId
	groupId: number
}

interface Database {
	users: Collection
	groups: Collection
}

interface User {
	userId: number
	name: string
	credits: number
	lastRated: Date
}

interface Median {
	median: number
}

export { User, Median, Group, Database }
