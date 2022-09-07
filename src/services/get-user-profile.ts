import { UserProfile } from '../types/index.js'
import { Collection } from 'mongodb'

async function getUserProfile(
	userDb: Collection,
	userId: number,
	localGroupId: number
) {
	const users = userDb.aggregate<UserProfile>([
		{ $match: { userId } },
		{
			$project: {
				_id: 0,
				credits: 1,
				global: {
					$sum: '$credits.credits'
				}
			}
		},
		{ $unwind: '$credits' },
		{ $match: { 'credits.groupId': localGroupId } },
		{
			$project: {
				global: 1,
				local: '$credits.credits'
			}
		}
	])
	
	return await users.next()
}

export { getUserProfile }
