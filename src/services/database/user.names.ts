import type { Database } from '../../types/index.js'

export async function getUserNames(
	database: Database,
	ids: number[]
): Promise<Record<string | number, string>> {
	if (ids.length === 0) {
		return {}
	}
	const users = await database
		.selectFrom('users')
		.select(['user_id', 'name'])
		.where('user_id', 'in', ids)
		.where('name', 'is not', null)
		.execute()
	return Object.fromEntries(
		users.map(user => [user.user_id, user.name as string])
	)
}
