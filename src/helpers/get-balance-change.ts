import type { MessageAction } from '../types/index.js'

// This file contents implementation of ELO rating
// Read more here:
// https://mattmazzola.medium.com/understanding-the-elo-rating-system-264572c7a2b4

function getChangeEffect(changer: number, target: number) {
	const probabilityConst = Number(process.env.ELO_PROBABILITY_CONST)
	return 1 / (1 + 10 ** ((changer - target) / probabilityConst))
}

function getBalanceChange(
	changer: number,
	target: number,
	action: MessageAction
) {
	const maxReward = Number(process.env.ELO_MAX_REWARD)
	const effect = getChangeEffect(changer, target)
	const change = Math.round(maxReward * (1 - effect))
	return change * action
}

export { getBalanceChange }
