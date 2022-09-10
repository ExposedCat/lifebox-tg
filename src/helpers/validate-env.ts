function validateEnv() {
	const required = [
		'TOKEN',
		'DB_CONNECTION_STRING',
		'POLL_LANG',
		'CREDITS_SMALL_PERCENT',
		'CREDITS_HIGH_PERCENT'
	]
	for (const env of required) {
		if (process.env[env] === undefined) {
			throw `ERROR: Required variable "${env}" is  not specified`
		}
	}
}

export { validateEnv }
