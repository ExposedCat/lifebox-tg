enum CreditState {
	Low = 'lowCredits',
	Normal = 'normalCredits',
	High = 'highCredits'
}

function getCreditState(credits: number, averageCredits: number) {
	let state = CreditState.Normal
	const lowPercent = Number(process.env.CREDITS_SMALL_PERCENT) / 100
	const lowLimit = averageCredits * lowPercent
	if (credits <= lowLimit) {
		state = CreditState.Low
	} else {
		const highPercent = Number(process.env.CREDITS_HIGH_PERCENT) / 100
		const highLimit = averageCredits * highPercent
		if (credits >= highLimit) {
			state = CreditState.High
		}
	}
	return state
}

export { getCreditState }
