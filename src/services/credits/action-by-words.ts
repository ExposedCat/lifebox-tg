import { MessageAction } from '../../types/index.js'
import fs from 'fs/promises'
import {
	resolvePath,
	sentenceContainsWord,
	getBalanceChange
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
	const result = {
		changer: 0,
		target: 0
	}

	const actionWords = JSON.parse(wordsFile)
	if (target !== undefined) {
		const increase = sentenceContainsWord(
			sentence,
			actionWords.increase as string[]
		)
		const decrease = sentenceContainsWord(
			sentence,
			actionWords.decrease as string[]
		)
		if (!increase && !decrease) {
			return result
		}
		const total = increase + decrease
		const main = Math.max(increase, decrease)
		const multiplier = main / total
		let action = MessageAction.IncreaseCredits
		if (decrease && decrease >= increase) {
			action = MessageAction.DecreaseCredits
		}
		const change = getBalanceChange(changer, target, action)
		result.target = Math.round(change * multiplier)
	}

	return result
}

export { getActionByWords }
