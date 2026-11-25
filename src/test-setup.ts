// Preloaded by bun test (bunfig.toml): give every test file the required config.
const defaults = {
	TOKEN: 'test',
	SQLITE_PATH: ':memory:',
	POLL_TIME: '0 12 * * *',
	POLL_LANG: 'en',
	ADMIN_ID: '1',
	VALUE_SMALL_PERCENT: '30',
	VALUE_HIGH_PERCENT: '130',
	RATING_LIMIT: '20',
	UNNAMED: 'Anonymous',
	PUBLIC_POLLS_CHAT_ID: '-100',
	PUBLIC_POLLS_CHAT_NAME: 'test'
}
for (const [key, value] of Object.entries(defaults)) Bun.env[key] ??= value
