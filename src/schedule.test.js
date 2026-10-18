import test from 'node:test'
import assert from 'node:assert/strict'

import { buildSchedule, generateSessions, DEFAULT_CLASSES, ALL_CLASSES, DEFAULT_TEACHERS, DEFAULT_STATUS_OPTIONS } from './schedule.js'

const yesStatus = [{ id: 'yes', label: '○', behavior: 'yes' }]

function session(key, manualAssignments = {}) {
  return {
    key,
    label: key,
    requiredClasses: ['X', 'Y'],
    manualAssignments,
    meeting: false,
    closed: false,
  }
}

test('random assignment avoids repeating the same class for a teacher when teachers can swap', () => {
  const teachers = [
    { name: 'A', classes: ['X', 'Y'], defaultStatus: 'yes' },
    { name: 'B', classes: ['X', 'Y'], defaultStatus: 'yes' },
  ]

  const schedule = buildSchedule(
    {},
    [session('1/1'), session('1/8')],
    teachers,
    yesStatus,
    { random: true, randomSeed: '0', avoidRepeatedClasses: true },
  )

  for (const teacher of teachers) {
    const assignedClasses = schedule.flatMap((entry) => (
      Object.entries(entry.assignments)
        .filter(([, teacherName]) => teacherName === teacher.name)
        .map(([className]) => className)
    ))
    assert.equal(new Set(assignedClasses).size, 2)
  }
})

test('repeated classes remain allowed when capability rules leave no alternative', () => {
  const teachers = [
    { name: 'A', classes: ['X'], defaultStatus: 'yes' },
    { name: 'B', classes: ['Y'], defaultStatus: 'yes' },
  ]

  const schedule = buildSchedule(
    {},
    [session('1/1'), session('1/8')],
    teachers,
    yesStatus,
    { random: true, randomSeed: '0', avoidRepeatedClasses: true },
  )

  assert.deepEqual(schedule.map((entry) => entry.assignments), [
    { X: 'A', Y: 'B' },
    { X: 'A', Y: 'B' },
  ])
})

test('a monthly-repeat tie avoids repeating the class from the immediately previous session', () => {
  const teachers = [
    { name: 'A', classes: ['X', 'Y'], defaultStatus: 'yes' },
    { name: 'B', classes: ['X', 'Y'], defaultStatus: 'yes' },
  ]

  const schedule = buildSchedule(
    {},
    [
      session('1/1', { X: 'A', Y: 'B' }),
      session('1/8', { X: 'B', Y: 'A' }),
      session('1/15'),
    ],
    teachers,
    yesStatus,
    { random: true, randomSeed: '1', avoidRepeatedClasses: true },
  )

  assert.deepEqual(schedule[2].assignments, { X: 'A', Y: 'B' })
})

test('an automatic assignment does not give a second class to a manually assigned teacher', () => {
  const teachers = [
    { name: 'A', classes: ['X', 'Y'], defaultStatus: 'yes' },
    { name: 'B', classes: ['Y'], defaultStatus: 'yes' },
  ]

  const schedule = buildSchedule(
    {},
    [session('1/1', { X: 'A' })],
    teachers,
    yesStatus,
    { random: false, avoidRepeatedClasses: true },
  )

  assert.deepEqual(schedule[0].assignments, { X: 'A', Y: 'B' })
})

test('a teacher at the monthly limit is not assigned again while others can cover', () => {
  const teachers = [
    { name: 'A', classes: ['X'], defaultStatus: 'yes', maxMonthlyAssignments: 1 },
    { name: 'B', classes: ['X'], defaultStatus: 'yes' },
  ]
  const one = key => ({ key, label: key, requiredClasses: ['X'], manualAssignments: {}, meeting: false, closed: false })
  const schedule = buildSchedule({}, [one('1/1'), one('1/8'), one('1/15')], teachers, yesStatus, { random: false })
  const countA = schedule.filter(entry => entry.assignments.X === 'A').length
  assert.equal(countA, 1)
  assert.deepEqual(schedule.flatMap(entry => entry.notes), [])
})

test('a △ teacher is added only when ○ teachers cannot fill every class', () => {
  const statuses = [{ id: 'yes', label: '○', behavior: 'yes' }, { id: 'maybe', label: '△', behavior: 'maybe' }]
  const teachers = [
    { name: 'A', classes: ['X', 'Y'], defaultStatus: 'yes' },
    { name: 'B', classes: ['X', 'Y'], defaultStatus: 'maybe' },
    { name: 'C', classes: ['X', 'Y'], defaultStatus: 'maybe' },
  ]
  const [entry] = buildSchedule({}, [session('1/1')], teachers, statuses, { random: false })
  assert.deepEqual(entry.selectedMaybeTeachers, ['B'])
  assert.deepEqual(new Set(Object.values(entry.assignments)), new Set(['A', 'B']))
})

test('classes that nobody can cover are reported as undecided', () => {
  const teachers = [{ name: 'A', classes: ['X', 'Y'], defaultStatus: 'yes' }]
  const [entry] = buildSchedule({}, [session('1/1')], teachers, yesStatus, { random: false })
  assert.equal(Object.keys(entry.assignments).length, 1)
  assert.equal(entry.unassignedClasses.length, 1)
  assert.ok(entry.notes.some(note => note.startsWith('人数不足のため未定')))
})

test('on meeting days a remote teacher is preferred so the trip covers both', () => {
  const teachers = [
    { name: 'A', classes: ['X'], defaultStatus: 'yes', remote: false },
    { name: 'B', classes: ['X'], defaultStatus: 'yes', remote: true },
  ]
  const meetingSession = { key: '1/1', label: '1/1', requiredClasses: ['X'], manualAssignments: {}, meeting: true, closed: false }
  const [entry] = buildSchedule({}, [meetingSession], teachers, yesStatus, { random: false })
  assert.deepEqual(entry.assignments, { X: 'B' })
})

test('the same seed reproduces the same random schedule', () => {
  const teachers = ['A', 'B', 'C', 'D'].map(name => ({ name, classes: ['X', 'Y'], defaultStatus: 'yes' }))
  const run = seed => buildSchedule({}, [session('1/1'), session('1/8')], teachers, yesStatus, { random: true, randomSeed: seed }).map(entry => entry.assignments)
  assert.deepEqual(run('fixed'), run('fixed'))
})

test('split weeks divide the introductory class and closed days get no assignments', () => {
  const sessions = generateSessions(2026, 10, { '2026-10': { '10/10': 'holiday' } }, {}, {}, {}, DEFAULT_CLASSES, ALL_CLASSES)
  assert.ok(sessions[0].requiredClasses.includes('入門(分割A)') && sessions[0].requiredClasses.includes('入門(分割B)'))
  assert.ok(!sessions[0].requiredClasses.includes('入門'))
  const [, closed] = buildSchedule({}, sessions, DEFAULT_TEACHERS, DEFAULT_STATUS_OPTIONS)
  assert.equal(closed.special, '休講')
  assert.deepEqual(closed.assignments, {})
})
