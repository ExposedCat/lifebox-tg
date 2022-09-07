import { Group } from '../types/index.js'
import { Collection } from 'mongodb'

function fetchGroups(groupsDb: Collection) {
	return groupsDb.find<Group>({})
}

export { fetchGroups }
