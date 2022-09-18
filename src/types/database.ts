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
	lastRated: Date
}

enum CreditState {
	Low = 'lowCredits',
	Normal = 'normalCredits',
	High = 'highCredits'
}

interface UserProfile {
	name?: string
	credits: number
	lastRated: Date
}

interface Database {
	users: Collection<User>
	groups: Collection<Group>
}

interface Median {
	median: number
}

export { Group, User, UserProfile, Database, CreditState, Median }
