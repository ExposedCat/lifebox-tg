import type { ReturnDocument } from 'mongodb'

class DbQueryBuilder {
	private static stage(stage: string, value: unknown) {
		return { [`$${stage}`]: value }
	}
	// General
	static match = this.stage.bind(null, 'match')
	static project = this.stage.bind(null, 'project')
	static group = this.stage.bind(null, 'group')
	static in = this.stage.bind(null, 'in')
	static addFields = this.stage.bind(null, 'addFields')
	static limit = (limit: number) => this.stage('limit', limit)
	static upsert = () => ({
		upsert: true,
		returnDocument: 'after' as ReturnDocument
	})
	static setOnInsert = (data: object) => this.stage('setOnInsert', data)
	static ne = (value: unknown) => this.stage('ne', value)
	static set = (data: object) => this.stage('set', data)
	// Arrays
	static filter = (
		arrayPath: string,
		iterator: string,
		condition: Record<string, unknown>
	) =>
		this.stage('filter', {
			input: `$${arrayPath}`,
			as: iterator,
			cond: condition
		})
	static elemMatch = this.stage.bind(null, 'elemMatch')
	static sort = (arrayName: string, order = 1) =>
		this.stage('sort', { [arrayName]: order })
	static unwind = (field: string) => this.stage('unwind', `$${field}`)
	static size = (arrayName: string) => this.stage('size', arrayName)
	static arrayElemAt = (arrayPath: string, index: number | object) =>
		this.stage('arrayElemAt', [`$${arrayPath}`, index])
	static indexOfArray = this.stage.bind(null, 'indexOfArray')
	static push = (entity: unknown) => this.stage('push', entity)
	static slice = (arrayPath: string, elementsNumber: number) =>
		this.stage('slice', [`$${arrayPath}`, elementsNumber])
	static nestedSort = (arrayName: string, field: string, order = 1) =>
		this.stage('addFields', {
			[arrayName]: this.stage('sortArray', {
				input: `$${arrayName}`,
				sortBy: { [field]: order }
			})
		})
	// Math
	static round = (value: unknown, place: number) =>
		this.stage('round', [value, place])
	static ceil = (value: unknown) => this.stage('ceil', value)
	static subtract = (
		diminutive: number | string | object,
		subtractive: number | string | object
	) => this.stage('subtract', [diminutive, subtractive])
	static sum = this.stage.bind(null, 'sum')
	static avg = (arrayPath: string) => this.stage('avg', `$${arrayPath}`)
	static gte = (value: unknown) => this.stage('gte', value)
	static divide = (dividend: unknown, divisor: unknown) =>
		this.stage('divide', [dividend, divisor])
	static inc = (field: string, value: number) =>
		this.stage('inc', { [field]: value })
	static cond = {
		gte: (path: string, value: unknown) => ({
			$gte: [`$$${path}`, value]
		})
	}
}

export { DbQueryBuilder }
