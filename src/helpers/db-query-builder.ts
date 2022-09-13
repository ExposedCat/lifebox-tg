class DbQueryBuilder {
	private static stage(stage: string, value: unknown) {
		return { [`$${stage}`]: value }
	}
	static match = this.stage.bind(null, 'match')
	static project = this.stage.bind(null, 'project')
	static group = this.stage.bind(null, 'group')
	static sort = this.stage.bind(null, 'sort')
	static unwind = (field: string) => this.stage('unwind', `$${field}`)
	static arrayElemAt = this.stage.bind(null, 'arrayElemAt')
	static subtract = this.stage.bind(null, 'subtract')
	static in = this.stage.bind(null, 'in')
	static indexOfArray = this.stage.bind(null, 'indexOfArray')
	static addFields = this.stage.bind(null, 'addFields')
	static limit = (limit: number) => this.stage('limit', limit)
	static setOnInsert = (data: object) => this.stage('setOnInsert', data)
	static upsert = () => ({ upsert: true })
	static push = (entity: object) => this.stage('push', entity)
	static ne = (expression: unknown) => this.stage('ne', expression)
	static set = (data: object) => this.stage('set', data)
	static inc = (field: string, value: number) =>
		this.stage('inc', { [field]: value })
}

export { DbQueryBuilder }
