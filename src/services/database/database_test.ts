import { beforeEach, describe, expect, test } from 'bun:test'

import { connectToDb } from '../../init/database.ts'
import type { Database } from '../../types/index.ts'
import { getUserRecap } from '../statistics/recap.ts'
import {
	createGroupIfNotExists,
	getGroup,
	setGroupTagUser,
	updateGroupSettings
} from './group.crud.ts'
import { getAverageLifeQuality, getUserAverages } from './statistics.ts'
import { createUserIfNotExists, updateUserDayRate } from './user.crud.ts'
import { getTopLifeUsers } from './user.graph.ts'

let db: Database

beforeEach(async () => {
	db = await connectToDb(':memory:')
})

describe('createUserIfNotExists', () => {
	test('is idempotent and only appends new memberships', async () => {
		await createUserIfNotExists(db, 10, 'Ann', -1)
		await createUserIfNotExists(db, 10, 'Ann', -1)
		await createUserIfNotExists(db, 10, 'Ann', -2)
		const memberships = await db
			.selectFrom('user_groups')
			.selectAll()
			.orderBy('group_index')
			.execute()
		expect(memberships).toEqual([
			{ user_id: 10, group_index: 0, group_id: -1 },
			{ user_id: 10, group_index: 1, group_id: -2 }
		])
	})

	test('updates the name but never clears it', async () => {
		await createUserIfNotExists(db, 10, 'Ann', -1)
		await createUserIfNotExists(db, 10, 'Anna', -1)
		await createUserIfNotExists(db, 10, '', -1)
		const user = await db.selectFrom('users').selectAll().executeTakeFirst()
		expect(user).toEqual({ user_id: 10, name: 'Anna' })
	})
})

describe('updateUserDayRate', () => {
	test('replaces the vote for the same poll', async () => {
		const date = new Date(2025, 5, 1)
		await updateUserDayRate(db, 10, 'Ann', 'poll-1', 2, date)
		await updateUserDayRate(db, 10, 'Ann', 'poll-1', -1, date)
		await updateUserDayRate(db, 10, 'Ann', 'poll-2', 1, date)
		const rates = await db
			.selectFrom('day_rates')
			.select(['rate_index', 'poll_id', 'value'])
			.orderBy('rate_index')
			.execute()
		expect(rates).toEqual([
			{ rate_index: 0, poll_id: 'poll-1', value: -1 },
			{ rate_index: 1, poll_id: 'poll-2', value: 1 }
		])
	})
})

describe('life quality', () => {
	test('averages per user, then across users, within a group', async () => {
		const date = new Date(2025, 5, 1)
		await createUserIfNotExists(db, 1, 'A', -1)
		await createUserIfNotExists(db, 2, 'B', -1)
		await createUserIfNotExists(db, 3, 'C', -2)
		await updateUserDayRate(db, 1, 'A', 'p1', 2, date)
		await updateUserDayRate(db, 1, 'A', 'p2', 1, date)
		await updateUserDayRate(db, 2, 'B', 'p1', -1, date)
		await updateUserDayRate(db, 3, 'C', 'p1', -2, date)

		expect(await getUserAverages(db, -1)).toEqual([
			{ userId: 1, name: 'A', lifeQuality: 1.5 },
			{ userId: 2, name: 'B', lifeQuality: -1 }
		])
		expect(await getAverageLifeQuality(db, -1)).toBe(0.3)
		expect(await getAverageLifeQuality(db, null)).toBe(-0.5)
		expect(await getAverageLifeQuality(db, -3)).toBe(0)
		expect(await getTopLifeUsers(db, -1)).toEqual({
			list: [
				{ name: 'A', lifeQuality: 1.5 },
				{ name: 'B', lifeQuality: -1 }
			],
			average: 0.3
		})
	})
})

describe('getUserRecap', () => {
	test('summarises a year and compares with the previous one', async () => {
		await updateUserDayRate(db, 1, 'A', 'p0', -1, new Date(2024, 3, 1))
		await updateUserDayRate(db, 1, 'A', 'p1', 2, new Date(2025, 0, 10))
		await updateUserDayRate(db, 1, 'A', 'p2', 1, new Date(2025, 0, 11))
		await updateUserDayRate(db, 1, 'A', 'p3', 0, new Date(2025, 2, 1))
		await updateUserDayRate(db, 2, 'B', 'p1', -2, new Date(2025, 0, 10))

		const recap = await getUserRecap(db, 1, 2025)
		expect(recap.days).toBe(3)
		expect(recap.average).toBe(1)
		expect(recap.commonAverage).toBe(0.25)
		expect(recap.averagePrev).toBe(-1)
		expect(recap.rateStreak).toBe(2)
		expect(recap.positiveStreak).toBe(2)
		expect(recap.rawMonths.map(month => month.average)).toEqual([1.5, 0])
		expect(recap.happiestMonth).toEqual({ index: 0, value: 1.5 })
		expect(recap.worstMonth).toEqual({ index: 2, value: 0 })
	})
})

describe('group settings', () => {
	test('toggles poll settings and reminder users', async () => {
		await createGroupIfNotExists(db, -1)
		await updateGroupSettings(db, -1, { receiveCustomPolls: true })
		await setGroupTagUser(db, -1, 5, true)
		await setGroupTagUser(db, -1, 5, true)
		await setGroupTagUser(db, -1, 6, true)
		await setGroupTagUser(db, -1, 5, false)
		expect(await getGroup(db, -1)).toEqual({
			groupId: -1,
			isChannel: false,
			settings: {
				tagUsers: [{ userId: 6 }],
				receiveCustomPolls: true,
				receiveDailyPolls: true
			}
		})
	})
})
