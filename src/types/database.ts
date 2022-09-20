import { Collection } from 'mongodb'

interface Group {
	groupId: number
}

interface User {
	userId: number
	name: string | undefined
	credits: {
		groupId: number
		credits: number
	}[]
	dayRates: {
		pollId: number
		date: Date
		value: number
	}[]
	lastRated: Date
}

enum ValueState {
	Low = 'low',
	Normal = 'normal',
	High = 'high'
}

interface UserProfile {
	name?: string
	credits: number
	lifeQuality: number
	lastRated: Date
}

interface UserLifeQuality {
	name?: string
	lifeQuality: number
}

interface Database {
	users: Collection<User>
	groups: Collection<Group>
}

export { Group, User, UserProfile, UserLifeQuality, Database, ValueState }
