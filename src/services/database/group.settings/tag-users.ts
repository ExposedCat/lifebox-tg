import type { Database, Group } from '../../../types/database.js'
import { updateGroup } from '../group.crud.js'

export function updateGroupTagUsersSetting(
	database: Database['groups'],
	group: Group,
	userId: number,
	newValue: boolean
) {
	const enabled = group.settings.tagUsers.some(user => user.userId === userId)
	if ((enabled && newValue) || (!enabled && !newValue)) {
		return
	}
	return updateGroup(database, group, [
		{
			$set: {
				'settings.tagUsers': {
					$cond: {
						if: { $in: [{ userId }, '$settings.tagUsers'] },
						then: {
							$filter: {
								input: '$settings.tagUsers',
								cond: { $ne: ['$$this.userId', userId] }
							}
						},
						else: {
							$concatArrays: ['$settings.tagUsers', [{ userId }]]
						}
					}
				}
			}
		}
	])
}
