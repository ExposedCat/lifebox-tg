import type { Database, Group } from '../../types/index.js'

function fetchGroups(database: Database['groups']) {
	return database.find<Group>({})
}

export { fetchGroups }
