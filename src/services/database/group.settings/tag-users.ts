import type { Database, Group } from '../../../types/database.js'
import { updateGroup } from '../group.crud.js'

export function updateGroupTagUsersSetting(
	database: Database['groups'],
	group: Group,
	userId: number,
	newValue: boolean
) {
	const tagUsers = group.settings?.tagUsers ?? []
	const enabled = tagUsers.some(user => user.userId === userId)
	if ((enabled && newValue) || (!enabled && !newValue)) {
		return
	}
	return updateGroup(database, group, [
		{
			$set: {
				'settings.tagUsers': {
					$cond: {
						if: {
							$in: [
								{ userId },
								{ $ifNull: ['$settings.tagUsers', []] }
							]
						},
						then: {
							$filter: {
								input: { $ifNull: ['$settings.tagUsers', []] },
								cond: { $ne: ['$$this.userId', userId] }
							}
						},
						else: {
							$concatArrays: [
								{ $ifNull: ['$settings.tagUsers', []] },
								[{ userId }]
							]
						}
					}
				}
			}
		}
	])
}
