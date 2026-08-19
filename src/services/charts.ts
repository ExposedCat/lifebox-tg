import ChartJsImage from 'chartjs-to-image'
import { randomUUID } from 'node:crypto'

import { COLORS, downloadImage, randomColor } from '../helpers/graph-utils.js'

function makeLabel(date: Date) {
	const formatter = new Intl.DateTimeFormat('uk', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	})
	return formatter.format(date)
}

function makeDatasetData(points: Point[], labels: Set<string>) {
	const values: Map<string, number> = new Map(
		points.map(it => [makeLabel(it.date), it.value])
	)
	const data: (number | null)[] = []
	for (const label of labels) {
		data.push(values.get(label) ?? null)
	}
	return data
}

type Point = { date: Date; value: number }

export type Dataset = { userId: number; label: string; points: Point[] }

type BoardChartEntry = { name: string; average: number }
type BoardChartColumn = {
	title: string
	entries: BoardChartEntry[]
}

type DataLabelContext = {
	dataIndex: number
	dataset: {
		isHeader: boolean
		positions: string[]
		names: string[]
		textColors: string[]
		values: string[]
		poops: { angle: number; offset: number; rotation: number }[][]
	}
}

async function generateChart(userDatasets: Dataset[], averagePoints: Point[]) {
	const labels = new Set(
		[...userDatasets.flatMap(it => it.points)]
			.sort((a, b) => Number(a.date) - Number(b.date))
			.map(it => makeLabel(it.date))
	)

	const datasets = userDatasets.map((it, i) => ({
		label: it.label,
		data: makeDatasetData(it.points, labels),
		borderColor: COLORS[i] ?? randomColor()
	}))
	datasets.push({
		label: 'Average',
		data: makeDatasetData(averagePoints, labels),
		borderColor: '#ffcd56'
	})

	const chart = new ChartJsImage()
	chart.setConfig({
		type: 'line',
		data: {
			labels: [...labels],
			datasets
		},
		options: {
			spanGaps: true,
			responsive: true,
			layout: {
				padding: 20
			},
			scales: {
				y: {
					suggestedMin: -2,
					suggestedMax: 2
				}
			}
		}
	})
	chart.setWidth(720)
	chart.setHeight(360)

	chart.setChartJsVersion('4.1.1')

	const path = `/tmp/chart-${Date.now()}.png`
	const url = chart.getUrl()
	await downloadImage(url, path)
	return path
}

async function generateBoardsChart(columns: BoardChartColumn[]) {
	const heatStyle = (average: number) => {
		if (average <= -1.5)
			return { fill: '#d98282', text: '#381616', line: '#e2a08e' }
		if (average <= -0.75)
			return { fill: '#e2a08e', text: '#3a1d17', line: '#e8c19c' }
		if (average < -0.1)
			return { fill: '#e8c19c', text: '#3a2915', line: '#e5d69a' }
		if (average <= 0.1)
			return { fill: '#e5d69a', text: '#332b0e', line: '#c7d4a5' }
		if (average < 0.75)
			return { fill: '#c7d4a5', text: '#273016', line: '#9fbd9d' }
		if (average < 1.5)
			return { fill: '#9fbd9d', text: '#17301b', line: '#79a58a' }
		return { fill: '#79a58a', text: '#10291a', line: '#608d75' }
	}
	const rowCount = Math.max(1, ...columns.map(column => column.entries.length))
	const truncate = (value: string) => {
		const characters = [...value]
		return characters.length > 20
			? `${characters.slice(0, 19).join('')}…`
			: value
	}
	const datasets = Array.from({ length: rowCount }, (_, datasetIndex) => {
		const entryIndex = rowCount - 1 - datasetIndex
		const entries = columns.map(column => column.entries[entryIndex])
		const positions = entries.map(entry => (entry ? `${entryIndex + 1}.` : ''))
		const names = entries.map((entry, columnIndex) => {
			if (entry) return truncate(entry.name)
			return columns[columnIndex].entries.length === 0 && entryIndex === 0
				? '—'
				: ''
		})
		const values = entries.map(entry => {
			if (!entry) return ''
			const average = `${entry.average > 0 ? '+' : ''}${entry.average.toFixed(2)}`
			return average
		})
		const styles = entries.map((entry, columnIndex) =>
			entry
				? columnIndex === 2
					? { fill: '#8b674c', text: '#ffffff', line: '#75533e' }
					: heatStyle(entry.average)
				: {
						fill: 'rgba(0, 0, 0, 0)',
						text: '#9ca3af',
						line: 'rgba(0, 0, 0, 0)'
					}
		)
		const poops = entries.map((entry, columnIndex) => {
			if (!entry || columnIndex !== 2) return []
			const count = Math.random() < 0.5 ? 2 : 3
			return Array.from({ length: count }, (_, poopIndex) => {
				const placeLeft =
					poopIndex === 0 || (poopIndex === 2 && Math.random() < 0.5)
				const angle = placeLeft
					? 174 + Math.random() * 12
					: -6 + Math.random() * 12
				return {
					angle,
					offset:
						poopIndex < 2 ? 58 + Math.random() * 14 : 30 + Math.random() * 14,
					rotation: -12 + Math.random() * 24
				}
			})
		})

		return {
			data: columns.map(() => 1),
			isHeader: false,
			positions,
			names,
			textColors: styles.map(style => style.text),
			values,
			poops,
			backgroundColor: styles.map(style => style.fill),
			borderColor: styles.map(style => style.line),
			borderWidth: entries.map(entry =>
				entry && entryIndex > 0 ? { top: 1, right: 0, bottom: 0, left: 0 } : 0
			),
			inflateAmount: 1,
			borderRadius: entries.map((entry, columnIndex) => {
				if (!entry) return 0
				const isTop = entryIndex === 0
				const isBottom = entryIndex === columns[columnIndex].entries.length - 1
				return {
					topLeft: isTop ? 7 : 0,
					topRight: isTop ? 7 : 0,
					bottomLeft: isBottom ? 7 : 0,
					bottomRight: isBottom ? 7 : 0
				}
			}),
			borderSkipped: false
		}
	})
	const headerDataset = {
		data: columns.map(() => 1),
		isHeader: true,
		positions: columns.map(() => ''),
		names: columns.map(column => column.title),
		textColors: columns.map(() => '#4b5563'),
		values: columns.map(() => ''),
		poops: columns.map(() => []),
		backgroundColor: columns.map(() => 'rgba(0, 0, 0, 0)'),
		borderColor: columns.map(() => 'rgba(0, 0, 0, 0)'),
		borderWidth: 0
	}

	const chart = new ChartJsImage()
	chart.setConfig({
		type: 'bar',
		data: {
			labels: columns.map(column => column.title),
			datasets: [...datasets, headerDataset]
		},
		options: {
			animation: false,
			responsive: true,
			layout: { padding: { left: 28, right: 28, bottom: 16 } },
			barPercentage: 0.9,
			categoryPercentage: 0.92,
			plugins: {
				legend: { display: false },
				datalabels: {
					clip: true,
					labels: {
						poop1: {
							display(context: DataLabelContext) {
								return Boolean(context.dataset.poops[context.dataIndex]?.[0])
							},
							anchor: 'center',
							align(context: DataLabelContext) {
								return context.dataset.poops[context.dataIndex]?.[0]?.angle ?? 0
							},
							offset(context: DataLabelContext) {
								return (
									context.dataset.poops[context.dataIndex]?.[0]?.offset ?? 0
								)
							},
							rotation(context: DataLabelContext) {
								return (
									(context.dataset.poops[context.dataIndex]?.[0]?.rotation ??
										0) + 180
								)
							},
							color: 'rgba(255, 246, 225, 0.5)',
							font: { size: 21 },
							formatter() {
								return '👍'
							}
						},
						poop2: {
							display(context: DataLabelContext) {
								return Boolean(context.dataset.poops[context.dataIndex]?.[1])
							},
							anchor: 'center',
							align(context: DataLabelContext) {
								return context.dataset.poops[context.dataIndex]?.[1]?.angle ?? 0
							},
							offset(context: DataLabelContext) {
								return (
									context.dataset.poops[context.dataIndex]?.[1]?.offset ?? 0
								)
							},
							rotation(context: DataLabelContext) {
								return (
									(context.dataset.poops[context.dataIndex]?.[1]?.rotation ??
										0) + 180
								)
							},
							color: 'rgba(255, 246, 225, 0.5)',
							font: { size: 21 },
							formatter() {
								return '👍'
							}
						},
						poop3: {
							display(context: DataLabelContext) {
								return Boolean(context.dataset.poops[context.dataIndex]?.[2])
							},
							anchor: 'center',
							align(context: DataLabelContext) {
								return context.dataset.poops[context.dataIndex]?.[2]?.angle ?? 0
							},
							offset(context: DataLabelContext) {
								return (
									context.dataset.poops[context.dataIndex]?.[2]?.offset ?? 0
								)
							},
							rotation(context: DataLabelContext) {
								return (
									(context.dataset.poops[context.dataIndex]?.[2]?.rotation ??
										0) + 180
								)
							},
							color: 'rgba(255, 246, 225, 0.5)',
							font: { size: 21 },
							formatter() {
								return '👍'							}
						},
						position: {
							display(context: DataLabelContext) {
								return !context.dataset.isHeader
							},
							anchor: 'center',
							align: 180,
							offset: 123,
							color(context: DataLabelContext) {
								return context.dataset.textColors[context.dataIndex]
							},
							font: { size: 16, weight: 'bold' },
							formatter(_value: number, context: DataLabelContext) {
								return context.dataset.positions[context.dataIndex]
							}
						},
						name: {
							anchor: 'center',
							align: 'center',
							color(context: DataLabelContext) {
								return context.dataset.textColors[context.dataIndex]
							},
							font(context: DataLabelContext) {
								return context.dataset.isHeader
									? { size: 29, weight: 'bold' }
									: { size: 18, weight: 'bold' }
							},
							formatter(_value: number, context: DataLabelContext) {
								return context.dataset.names[context.dataIndex]
							}
						},
						value: {
							display(context: DataLabelContext) {
								return !context.dataset.isHeader
							},
							anchor: 'center',
							align: 0,
							offset: 97,
							color(context: DataLabelContext) {
								return context.dataset.textColors[context.dataIndex]
							},
							font: { size: 17, weight: 'bold' },
							formatter(_value: number, context: DataLabelContext) {
								return context.dataset.values[context.dataIndex]
							}
						}
					}
				}
			},
			scales: {
				x: {
					stacked: true,
					display: false
				},
				y: {
					display: false,
					stacked: true,
					min: 0,
					max: rowCount + 1
				}
			}
		}
	})
	chart.setWidth(1200)
	chart.setHeight(Math.max(240, 80 + rowCount * 60))
	chart.setBackgroundColor('#ffffff')
	chart.setChartJsVersion('4.1.1')

	const path = `/tmp/boards-${randomUUID()}.png`
	await chart.toFile(path)
	return path
}

export { generateBoardsChart, generateChart }
export type { Point }
