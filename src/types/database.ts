import { ObjectId, Collection } from 'mongodb'

interface LocalUserData {
	_id: ObjectId
	groupId: number
	credits: number
}

interface User {
	_id: ObjectId
	userId: number
	credits: LocalUserData[]
}

interface UserProfile {
	global: number,
	local: number
}

interface Group {
	_id: ObjectId
	groupId: number
}

interface Database {
	users: Collection
	groups: Collection
}

export { User, UserProfile, Group, Database }
