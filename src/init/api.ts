import { getUserRecap } from '../services/statistics/recap.ts'
import type { Database } from '../types/index.ts'

const WRAPPED_YEAR = 2025

// The Wrapped mini app reads `ok`/`error` from the body, so failures keep
// answering 200 with `ok: false`.
const reply = (body: { ok: boolean; data: unknown; error: string | null }) =>
	Response.json(body, {
		headers: { 'Content-Type': 'application/json; charset=UTF-8' }
	})

export function startApi(database: Database, port: number) {
	const server = Bun.serve({
		port,
		async fetch(request) {
			const userId = Number(new URL(request.url).searchParams.get('user_id'))
			if (!Number.isSafeInteger(userId) || userId <= 0) {
				return reply({ ok: false, data: null, error: 'Unauthorized' })
			}
			try {
				const recap = await getUserRecap(database, userId, WRAPPED_YEAR)
				return reply({ ok: true, data: recap, error: null })
			} catch (error) {
				return reply({ ok: false, data: null, error: `${error}` })
			}
		}
	})
	console.info(`LifeBox API is started on port ${server.port}`)
	return server
}
