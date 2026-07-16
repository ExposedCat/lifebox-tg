import type { Database } from '../../types/index.js'

export async function getUserNames(
	database: Database['users'],
	ids: number[]
): Promise<Record<string | number, string>> {
	const nameList = await database
		.aggregate<{
			name: string
			userId: number
		}>([
			{
				$match: { userId: { $in: ids } }
			},
			{
				$project: {
					_id: 0,
					userId: 1,
					name: 1
				}
			}
		])
		.toArray()
	return Object.fromEntries(nameList.map(({ name, userId }) => [userId, name]))
}
