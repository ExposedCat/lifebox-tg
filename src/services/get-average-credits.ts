import { Collection } from 'mongodb'

// TODO: Move to helpers
function stage(stage: string, query: object | string) {
	return { [`$${stage}`]: query }
}
const match = stage.bind(null, 'match')
const project = stage.bind(null, 'project')
const group = stage.bind(null, 'group')
const sort = stage.bind(null, 'sort')
const unwind = stage.bind(null, 'unwind')

async function getAverageCredits(userDb: Collection, groupId: number) {
	const matchQuery = match({ 'credits.groupId': groupId })
	const aggregation = userDb.aggregate<{ position: number }>([
		matchQuery,
		unwind('$credits'),
		sort({ 'credits.credits': 1 }),
		matchQuery,
		group({
			_id: 'id',
			array: { $push: '$credits.credits' }
		}),
		project({
			_id: 0,
			array: 1,
			position: {
				$ceil: {
					$divide: [{ $size: '$array' }, 2]
				}
			}
		}),
		project({ array: 0 })
	])

	const data = await aggregation.next()
	const median = (data?.position || 1) - 1

	return median
}

export { getAverageCredits }
