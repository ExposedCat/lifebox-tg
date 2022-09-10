import { MessageAction } from '../../types/index.js'

import fs from 'fs/promises'

import {
	resolvePath,
	sentenceContainsWord,
	getRandomIntByChance
} from '../../helpers/index.js'

async function getActionByWords(sentence: string) {
	const wordsFile = await fs.readFile(
		resolvePath(import.meta.url, '../../data/words.json'),
		'utf-8'
	)
	let result = {
		changer: 0,
		target: 0
	}

	const actionWords = JSON.parse(wordsFile)
	const containsIncrease = sentenceContainsWord(
		sentence,
		actionWords.increase as string[]
	)
	if (containsIncrease) {
		result.target = MessageAction.IncreaseCredits
	}
	const containsDecrease = sentenceContainsWord(
		sentence,
		actionWords.decrease as string[]
	)
	if (containsDecrease) {
		result.target = MessageAction.DecreaseCredits
	}

	const containsBad = sentenceContainsWord(
		sentence,
		actionWords.bad as string[]
	)
	if (containsBad) {
		const chance = Number(process.env.DECREASE_CREDITS_CHANCE)
		const decrease = getRandomIntByChance(chance, 1, 1)
		if (decrease) {
			result.changer = -getRandomIntByChance(100, 1, 5)
		}
	}
	return result
}

export { getActionByWords }
