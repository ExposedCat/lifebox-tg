import type { Collection } from 'mongodb'

interface Group {
	groupId: number
	isChannel: boolean
}

interface Poll {
	pollId: string
	messageId?: number
	date: Date
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
	polls: Collection<Poll>
}

export { Group, User, Poll, UserProfile, UserLifeQuality, Database, ValueState }
