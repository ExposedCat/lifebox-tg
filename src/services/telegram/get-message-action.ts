import { MessageAction, UserProfile } from '../../types/index.js'

import { getSentence } from '../../helpers/index.js'
import { getActionByWords } from '../../services/index.js'

async function getMessageAction(
	message: string,
	changer: UserProfile,
	target?: UserProfile
) {
	const sentence = getSentence(message)
	for (const func of [getActionByWords]) {
		const changes = await func(sentence, changer.credits, target?.credits)
		if (changes) {
			return changes
		}
	}
	return {
		changer: MessageAction.Nothing,
		target: MessageAction.Nothing
	}
}

export { getMessageAction }
