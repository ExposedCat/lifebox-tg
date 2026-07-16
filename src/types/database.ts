import type { Collection } from 'mongodb'

type Group = {
	groupId: number
	isChannel: boolean
	settings: {
		tagUsers: { userId: number }[]
		receiveCustomPolls: boolean
		receiveDailyPolls: boolean
	}
}

type Poll = {
	pollId: string
	messageId?: number
	date: Date
}

type DayRate = {
	pollId: number
	date: Date
	value: number
}

type User = {
	userId: number
	name: string | undefined
	groups: number[]
	dayRates: DayRate[]
}

enum ValueState {
	Low = 'low',
	Normal = 'normal',
	High = 'high'
}

type UserProfile = {
	name?: string
	lifeQuality: number
}

type UserLifeQuality = {
	name?: string
	lifeQuality: number
}

type Database = {
	users: Collection<User>
	groups: Collection<Group>
	polls: Collection<Poll>
}

export {
	Group,
	User,
	Poll,
	UserProfile,
	UserLifeQuality,
	Database,
	ValueState,
	DayRate
}
