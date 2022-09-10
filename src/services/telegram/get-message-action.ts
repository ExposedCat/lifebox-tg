import { MessageActions } from '../../types/index.js'

import { getSentence } from '../../helpers/index.js'
import { getActionByWords } from '../action-providers/index.js'

async function getMessageAction(message: string) {
	const sentence = getSentence(message)
	for (const func of [getActionByWords]) {
		const action = await func(sentence)
		if (action) {
			return action
		}
	}
	return MessageActions.Nothing
}

export { getMessageAction }
