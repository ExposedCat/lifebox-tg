import fs from 'fs/promises'
import fetch from 'node-fetch'
import ChartJsImage from 'chartjs-to-image'

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

// TODO: Move to helpers
async function downloadImage(url: string, filename: string) {
	const response = await fetch(url)
	const buffer = await response.arrayBuffer()
	await fs.writeFile(filename, new DataView(buffer))
}

// TODO: Move to helpers
const COLORS = [
	'#ff6384',
	'#9966ff',
	'#36a2eb',
	'#4bc0c0',
	'#ff9f40',
	'#c9cbcf'
]
const randomColor = () =>
	`#${Math.floor(Math.random() * 16777215).toString(16)}`

type Point = { date: Date; value: number }

export type Dataset = { label: string; points: Point[] }

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

export { generateChart }
export type { Point }
