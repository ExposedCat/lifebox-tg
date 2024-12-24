import * as http from 'http'
import { getUserRecap } from '../services/statistics/recap.js'
import type { Database } from '../types'

export function startApi(database: Database) {
	const server = http.createServer(async (req, res) => {
		const parsedUrl = new URL(`http://domain${req.url}`)
		const userId = parsedUrl.searchParams.get('user_id')
		if (!userId) {
			res.end(JSON.stringify({ ok: false, data: null, error: 'Unauthorized' }))
			return
		}
		res.statusCode = 200
		res.setHeader('Content-Type', 'application/json; charset=UTF-8')
		try {
			const recap = await getUserRecap(database.users, Number(userId), 2024)
			res.end(JSON.stringify({ ok: true, data: recap, error: null }))
		} catch (error) {
			res.end(JSON.stringify({ ok: false, data: null, error: `${error}` }))
		}
	})

	server.listen(8081, () => console.log(`LifeBox API is started`))

	return server
}
