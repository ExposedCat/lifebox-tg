import { MessageAction } from '../../types/index.js'

import { getRandomIntByChance, getSentence } from '../../helpers/index.js'
import { getActionByWords } from '../../services/index.js'

async function getMessageAction(
	message: string,
	changer: number,
	target: number
) {
	const shouldChange = getRandomIntByChance(100, 0, 1)
	if (shouldChange) {
		const sentence = getSentence(message)
		for (const func of [getActionByWords]) {
			const changes = await func(sentence, changer, target)
			if (changes) {
				return changes
			}
		}
	}
	return {
		changer: MessageAction.Nothing,
		target: MessageAction.Nothing
	}
}

export { getMessageAction }
