// Parsed once at startup; Bun loads `.env` from the working directory itself.
function requiredEnv(name: string): string {
	const value = Bun.env[name]
	if (value === undefined) {
		throw new Error(`Required variable "${name}" is not set`)
	}
	return value
}

function requiredNumberEnv(name: string): number {
	const value = Number(requiredEnv(name))
	if (!Number.isFinite(value)) {
		throw new Error(`Variable "${name}" must be a number`)
	}
	return value
}

function optionalNumberEnv(name: string, fallback: number): number {
	return Bun.env[name] === undefined ? fallback : requiredNumberEnv(name)
}

export const APP_ENV = {
	TOKEN: requiredEnv('TOKEN'),
	SQLITE_PATH: Bun.env.SQLITE_PATH || 'telegram-bot.sqlite',
	API_PORT: optionalNumberEnv('API_PORT', 8081),
	POLL_TIME: requiredEnv('POLL_TIME'),
	POLL_LANG: requiredEnv('POLL_LANG'),
	ADMIN_ID: requiredNumberEnv('ADMIN_ID'),
	VALUE_SMALL_PERCENT: requiredNumberEnv('VALUE_SMALL_PERCENT'),
	VALUE_HIGH_PERCENT: requiredNumberEnv('VALUE_HIGH_PERCENT'),
	RATING_LIMIT: requiredNumberEnv('RATING_LIMIT'),
	UNNAMED: requiredEnv('UNNAMED'),
	PUBLIC_POLLS_CHAT_ID: requiredNumberEnv('PUBLIC_POLLS_CHAT_ID'),
	PUBLIC_POLLS_CHAT_NAME: requiredEnv('PUBLIC_POLLS_CHAT_NAME')
}

export function isAdmin(userId: number | undefined) {
	return userId === APP_ENV.ADMIN_ID
}
