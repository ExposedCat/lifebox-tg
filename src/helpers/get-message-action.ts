import { MessageActions } from '../types/index.js'

function wordPattern(word: string) {
	const prefix = '(?:s|^)'
	const shouldPrefix = !word.startsWith('*')
	const infix = '(?:s|$)'
	const shouldInfix = !word.endsWith('*')

	const clearWord = word.replaceAll('*', '').replaceAll('+', '\\+')
	const finalPrefix = shouldPrefix ? prefix : ''
	const finalInfix = shouldInfix ? infix : ''

	return `${finalPrefix}${clearWord}${finalInfix}`
}

function getWords(message: string) {
	let words = []
	let word = ''
	for (const symbol of message) {
		if (symbol === ' ') {
			words.push(word)
			word = ''
		} else {
			const code = symbol.charCodeAt(0)
			const russian = (code >= 1072 && code <= 1102) || code === 105
			const special = symbol === '+' || symbol === '-'
			if (russian || special) {
				word += symbol
			}
		}
	}
	words.push(word)
	return words
}

function checkWordAction(word: string, actionWords: string[]) {
	const pattern = new RegExp(actionWords.map(wordPattern).join('|'), 'i')
	return pattern.test(word)
}

function getMessageAction(message: string) {
	const words = getWords(message)
	// TODO: Move to separate file?
	const increaseWords = {
		actionWords: [
			'спасибо',
			'лайк',
			'найс',
			'*хорош',
			'молодец',
			'малодец',
			'+'
		],
		action: MessageActions.IncreaseCredits
	}
	const decreaseWords = {
		actionWords: ['осуждаю', 'дизлайк*', 'диз', 'найс', '*плох', '-'],
		action: MessageActions.DecreaseCredits
	}
	for (const { actionWords, action } of [increaseWords, decreaseWords]) {
		if (words.some(word => checkWordAction(word, actionWords))) {
			return action
		}
	}
	return MessageActions.Nothing
}

export { getMessageAction }
