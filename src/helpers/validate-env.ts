function validateEnv() {
	const required = [
		'TOKEN',
		'DB_CONNECTION_STRING',
		'POLL_LANG',
		'VALUE_SMALL_PERCENT',
		'VALUE_HIGH_PERCENT',
		'ELO_PROBABILITY_CONST',
		'ELO_MAX_REWARD',
		'RATING_LIMIT',
		'UNNAMED',
		'INITIAL_CREDITS',
		'REACTIONS_PROVIDER_ID',
		'RATE_TIMEOUT_MS',
		'ADMIN_ID',
		'PUBLIC_POLLS_CHAT_ID',
		'PUBLIC_POLLS_CHAT_NAME'
	]
	for (const env of required) {
		if (process.env[env] === undefined) {
			throw `ERROR: Required variable "${env}" is  not specified`
		}
	}
}

export { validateEnv }
