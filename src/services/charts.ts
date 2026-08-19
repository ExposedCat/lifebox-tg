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
	accent: string
	entries: BoardChartEntry[]
}

type DataLabelContext = {
	dataIndex: number
	dataset: { labels: string[] }
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
	const boardFills = [
		['#dcfce7', '#f0fdf4'],
		['#dbeafe', '#eff6ff'],
		['#fee2e2', '#fef2f2']
	]
	const truncate = (value: string) => {
		const characters = [...value]
		return characters.length > 22
			? `${characters.slice(0, 21).join('')}…`
			: value
	}
	const datasets = Array.from({ length: 10 }, (_, datasetIndex) => {
		const entryIndex = 9 - datasetIndex
		const labels = columns.map(column => {
			const entry = column.entries[entryIndex]
			if (!entry) {
				return column.entries.length === 0 && entryIndex === 0 ? 'No users' : ''
			}
			const average = `${entry.average > 0 ? '+' : ''}${entry.average.toFixed(2)}`
			return `${entryIndex + 1}. ${truncate(entry.name)}    ${average}`
		})

		return {
			data: columns.map(() => 1),
			labels,
			backgroundColor: labels.map((label, columnIndex) =>
				label ? boardFills[columnIndex][entryIndex % 2] : 'rgba(0, 0, 0, 0)'
			),
			borderColor: '#f8fafc',
			borderWidth: 2
		}
	})

	const chart = new ChartJsImage()
	chart.setConfig({
		type: 'bar',
		data: {
			labels: columns.map(column => column.title),
			datasets
		},
		options: {
			animation: false,
			responsive: true,
			layout: { padding: { left: 24, right: 24, bottom: 24 } },
			barPercentage: 0.94,
			categoryPercentage: 0.94,
			plugins: {
				legend: { display: false },
				datalabels: {
					anchor: 'center',
					align: 'center',
					clip: true,
					color: '#0f172a',
					font: { size: 18, weight: 'bold' },
					formatter(_value: number, context: DataLabelContext) {
						return context.dataset.labels[context.dataIndex]
					}
				}
			},
			scales: {
				x: {
					stacked: true,
					position: 'top',
					grid: { display: false },
					border: { display: false },
					ticks: {
						color: columns.map(column => column.accent),
						font: { size: 30, weight: 'bold' },
						padding: 18
					}
				},
				y: {
					display: false,
					stacked: true,
					min: 0,
					max: 10
				}
			}
		}
	})
	chart.setWidth(1200)
	chart.setHeight(700)
	chart.setBackgroundColor('#f8fafc')
	chart.setChartJsVersion('4.1.1')

	const path = `/tmp/boards-${randomUUID()}.png`
	await chart.toFile(path)
	return path
}

export { generateBoardsChart, generateChart }
export type { Point }
