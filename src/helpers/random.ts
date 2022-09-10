function randomInteger(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomIntByChance(chance: number, min: number, max: number) {
	const zero = Math.random() >= chance / 100
	if (zero) {
		return 0
	}
	return randomInteger(min, max)
}

export { getRandomIntByChance }
