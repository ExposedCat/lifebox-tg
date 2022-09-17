function validateEnv() {
	const required = [
		'TOKEN',
		'DB_CONNECTION_STRING',
		'POLL_LANG',
		'CREDITS_SMALL_PERCENT',
		'CREDITS_HIGH_PERCENT',
		'ELO_PROBABILITY_CONST',
		'ELO_MAX_REWARD',
		'RATING_LIMIT',
		'UNNAMED',
		'INITIAL_CREDITS',
		'REACTIONS_PROVIDER_ID',
		'RATE_TIMEOUT_MS'
		'REACTIONS_PROVIDER_ID'
	]
	for (const env of required) {
		if (process.env[env] === undefined) {
			throw `ERROR: Required variable "${env}" is  not specified`
		}
	}
}

export { validateEnv }
