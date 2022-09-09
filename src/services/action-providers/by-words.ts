import { MessageActions } from '../../types/index.js'

import fs from 'fs/promises'

import { resolvePath, sentenceContainsWord } from '../../helpers/index.js'

async function getActionByWords(sentence: string) {
	const wordsFile = await fs.readFile(
		resolvePath(import.meta.url, '../data/words.json'),
		'utf-8'
	)
	const actionWords = JSON.parse(wordsFile)
	const containsIncrease = sentenceContainsWord(
		sentence,
		actionWords.increase as string[]
	)
	if (containsIncrease) {
		return MessageActions.IncreaseCredits
	}
	const containsDecrease = sentenceContainsWord(
		sentence,
		actionWords.decrease as string[]
	)
	if (containsDecrease) {
		return MessageActions.DecreaseCredits
	}
	return MessageActions.Nothing
}

export { getActionByWords }
