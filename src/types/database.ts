import type { Kysely } from 'kysely'

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
	pollId: string
	date: Date
	value: number
}

type User = {
	userId: number
	name: string | undefined
	groups: number[]
	dayRates: DayRate[]
}

type DatabaseSchema = {
	users: {
		user_id: number
		name: string | null
		mongo_id: string
	}
	user_groups: {
		user_id: number
		group_index: number
		group_id: number
	}
	day_rates: {
		user_id: number
		rate_index: number
		poll_id: string
		date: number | null
		value: number | null
	}
	groups: {
		group_id: number
		is_channel: number
		receive_custom_polls: number
		receive_daily_polls: number
		mongo_id: string
	}
	group_tag_users: {
		group_id: number
		user_index: number
		user_id: number
	}
	polls: {
		poll_id: string
		message_id: number | null
		date: number
		mongo_id: string
	}
	migration_state: {
		name: string
		completed_at: number
	}
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

type Database = Kysely<DatabaseSchema>

export {
	Group,
	User,
	Poll,
	UserProfile,
	UserLifeQuality,
	Database,
	DatabaseSchema,
	ValueState,
	DayRate
}
