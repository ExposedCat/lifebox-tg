import type { Database, Group } from '../../../types/database.js'
import { updateGroupSettings } from '../group.crud.js'

export function updateGroupCustomPollsSetting(
	database: Database['groups'],
	group: Group,
	newValue: boolean
) {
	return updateGroupSettings(database, group, { receiveCustomPolls: newValue })
}
