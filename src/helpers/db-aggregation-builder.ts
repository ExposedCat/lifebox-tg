class AggregationBuilder {
	private static stage(stage: string, query: object | string) {
		return { [`$${stage}`]: query }
	}
	static match = this.stage.bind(null, 'match')
	static project = this.stage.bind(null, 'project')
	static group = this.stage.bind(null, 'group')
	static sort = this.stage.bind(null, 'sort')
	static unwind = this.stage.bind(null, 'unwind')
	static arrayElemAt = this.stage.bind(null, 'arrayElemAt')
	static subtract = this.stage.bind(null, 'subtract')
}

export { AggregationBuilder }
