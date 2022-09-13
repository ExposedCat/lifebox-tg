import { MessageAction } from '../../types/index.js'

import fs from 'fs/promises'

import {
	resolvePath,
	sentenceContainsWord,
	getBalanceChange,
	getRandomInt
} from '../../helpers/index.js'

async function getActionByWords(
	sentence: string,
	changer: number,
	target?: number
) {
	const wordsFile = await fs.readFile(
		resolvePath(import.meta.url, '../../data/words.json'),
		'utf-8'
	)
	let result = {
		changer: 0,
		target: 0
	}

	const actionWords = JSON.parse(wordsFile)
	if (target !== undefined) {
		const containsIncrease = sentenceContainsWord(
			sentence,
			actionWords.increase as string[]
		)
		if (containsIncrease) {
			result.target = getBalanceChange(
				changer,
				target,
				MessageAction.IncreaseCredits
			)
		}
		const containsDecrease = sentenceContainsWord(
			sentence,
			actionWords.decrease as string[]
		)
		if (containsDecrease) {
			result.target = getBalanceChange(
				changer,
				target,
				MessageAction.DecreaseCredits
			)
		}
	}

	const containsBad = sentenceContainsWord(
		sentence,
		actionWords.bad as string[]
	)
	if (containsBad) {
		result.changer = -getRandomInt(
			Number(process.env.BAD_WORDS_DECREASE_MIN),
			Number(process.env.BAD_WORDS_DECREASE_MAX)
		)
	}
	return result
}

export { getActionByWords }
