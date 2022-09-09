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

function sentenceContainsWord(sentence: string, actionWords: string[]) {
	for (const word of actionWords) {
		if (wordPattern(word).test(sentence)) {
			return true
		}
	}
	return false
}

export { getSentence, sentenceContainsWord }
