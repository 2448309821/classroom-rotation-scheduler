// 架空の出席回答から、1か月分の担当表を作って表示する例。
import { DEFAULT_CLASSES, ALL_CLASSES, DEFAULT_TEACHERS, DEFAULT_STATUS_OPTIONS, generateSessions, buildSchedule } from '../src/schedule.js'

const year = 2026
const month = 10
const sessions = generateSessions(year, month, { [`${year}-${month}`]: { '10/3': 'meeting' } }, {}, {}, {}, DEFAULT_CLASSES, ALL_CLASSES)

// 講師ごとの回答（○=yes、△=maybe、×=no、例会のみ=meeting_only）。すべて架空です。
const answers = {
  '講師A': ['yes', 'no', 'yes', 'yes', 'no'],
  '講師B': ['yes', 'yes', 'maybe', 'yes', 'yes'],
  '講師C': ['meeting_only', 'yes', 'yes', 'no', 'yes'],
  '講師D': ['no', 'yes', 'yes', 'yes', 'maybe'],
  '講師E': ['yes', 'yes', 'no', 'yes', 'yes'],
  '講師F': ['yes', 'yes', 'yes', 'maybe', 'yes'],
  '講師G': ['maybe', 'no', 'yes', 'yes', 'yes'],
  '講師H': ['yes', 'yes', 'yes', 'no', 'yes'],
}
const attendance = Object.fromEntries(Object.entries(answers).map(([name, list]) => [name, Object.fromEntries(sessions.map((s, i) => [s.key, list[i] ?? 'no']))]))
const teachers = DEFAULT_TEACHERS.map(t => ({ ...t, maxMonthlyAssignments: 3 }))

const schedule = buildSchedule(attendance, sessions, teachers, DEFAULT_STATUS_OPTIONS, { random: true, randomSeed: 'sample', avoidRepeatedClasses: true })

for (const entry of schedule) {
  const pairs = Object.entries(entry.assignments).map(([cls, name]) => `${cls}: ${name}`).join(' / ')
  console.log(`${entry.label}${entry.special ? `（${entry.special}）` : ''}  ${pairs || '-'}${entry.notes.length ? `  ※${entry.notes.join('、')}` : ''}`)
}
