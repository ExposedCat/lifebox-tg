function validateEnv() {
	const required = [
		'TOKEN',
		'DB_CONNECTION_STRING',
		'POLL_LANG',
		'CREDITS_SMALL_PERCENT',
		'CREDITS_HIGH_PERCENT',
		'ELO_PROBABILITY_CONST',
		'ELO_MAX_REWARD',
		'FREE_CREDITS_CHANCE',
		'FREE_CREDITS_MIN',
		'FREE_CREDITS_MAX',
		'DECREASE_CREDITS_CHANCE',
		'TOP_LIMIT',
		'UNNAMED'
	]
	for (const env of required) {
		if (process.env[env] === undefined) {
			throw `ERROR: Required variable "${env}" is  not specified`
		}
	}
}

export { validateEnv }
