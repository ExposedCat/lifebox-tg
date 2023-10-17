import type { Database, Poll } from '../../types/index.js'

export function getPoll(database: Database['polls'], pollId: string) {
	return database.findOne<Poll>({ pollId })
}
