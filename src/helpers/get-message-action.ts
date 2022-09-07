import { MessageActions } from '../types/index.js'

import fs from 'fs/promises'

import { resolvePath } from './index.js'

function wordPattern(word: string) {
	const prefix = '(?:\\s|^)'
	const shouldPrefix = !word.startsWith('*')
	const infix = '(?:\\s|$)'
	const shouldInfix = !word.endsWith('*')

	const clearWord = word.replaceAll('*', '').replaceAll('+', '\\+')
	const finalPrefix = shouldPrefix ? prefix : ''
	const finalInfix = shouldInfix ? infix : ''

	return new RegExp(`${finalPrefix}${clearWord}${finalInfix}`, 'i')
}

function getSentence(message: string) {
	let sentence = ''
	for (const symbol of message) {
		const code = symbol.charCodeAt(0)
		const russian = (code >= 1072 && code <= 1103) || code === 105
		const special = '👍👎+- '.includes(symbol)
		if (russian || special) {
			sentence += symbol
		}
	}
	return sentence
}

async function getMessageAction(message: string) {
	const sentence = getSentence(message)
	const wordsFile = await fs.readFile(
		resolvePath(import.meta.url, '../data/words.json'),
		'utf-8'
	)
	const actionWords = JSON.parse(wordsFile)
	const increaseWords = {
		actionWords: (actionWords.increase as string[]) || [],
		action: MessageActions.IncreaseCredits
	}
	const decreaseWords = {
		actionWords: (actionWords.decrease as string[]) || [],
		action: MessageActions.DecreaseCredits
	}
	for (const { actionWords, action } of [increaseWords, decreaseWords]) {
		for (const word of actionWords) {
			if (wordPattern(word).test(sentence)) {
				return action
			}
		}
	}
	return MessageActions.Nothing
}

export { getMessageAction }
