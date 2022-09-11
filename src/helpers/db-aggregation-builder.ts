class AggregationBuilder {
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
}

export { AggregationBuilder }
