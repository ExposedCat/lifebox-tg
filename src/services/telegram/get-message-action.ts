import { MessageAction } from '../../types/index.js'

import { getSentence } from '../../helpers/index.js'
import { getActionByWords } from '../credits/index.js'

async function getMessageAction(message: string) {
	const sentence = getSentence(message)
	for (const func of [getActionByWords]) {
		const action = await func(sentence)
		if (action) {
			return action
		}
	}
	return MessageAction.Nothing
}

export { getMessageAction }
