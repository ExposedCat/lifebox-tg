import type { Database, Group } from '../../../types/database.js'
import { updateGroupSettings } from '../group.crud.js'

export function updateGroupDailyPollsSetting(
	database: Database,
	group: Group,
	newValue: boolean
) {
	return updateGroupSettings(database, group, { receiveDailyPolls: newValue })
}
